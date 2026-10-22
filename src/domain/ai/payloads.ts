import type { Brief } from '../brief/schema';
import { categoryLabel, type LibraryCategory } from '../library/schema';
import { PRICING_CHOICES, pricingChoiceFor, type PricingChoiceId } from '../library/units';
import { formatMoney } from '../money';
import { calcItemCents, pricingContextOf, type PricingContext } from '../quote/calc';
import { isIndividualItem } from '../quote/individual';
import type { Item, PricingRule, QuoteBody, Unit } from '../quote/schema';
import type { AiAction, PolishField } from './schema';

/**
 * Ładunki wysyłane do funkcji brzegowej `ai` (FEATURES-AI.md §1, reguła A7).
 *
 * ## Po co osobna warstwa
 *
 * To **tutaj** rozstrzyga się, co model w ogóle widzi. Komponent nie wysyła
 * `Brief` ani `LibraryItem` „jak leci" — przechodzi przez budowniczych, którzy
 * zostawiają pytania, odpowiedzi, nazwy i ceny, a odcinają e-mail, telefon,
 * adres, token linku i IP. Funkcje są czyste, więc test może sprawdzić, że
 * żadne pole kontaktowe nie przecieka, bez podnoszenia Supabase.
 */

/** Źródło dokumentu do importu: tekst, PDF albo obraz (base64 bez prefiksu `data:`). */
export type AiFileSource =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; base64: string }
  | {
      kind: 'image';
      mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      base64: string;
    };

export interface ImportLibraryPayload {
  source: AiFileSource;
  /** Nazwy istniejących grup — model ma ich używać dosłownie. */
  categories: string[];
  /** Nazwy usług już w bibliotece — do oznaczenia „już masz". */
  existingNames: string[];
}

/** Opis usługi z biblioteki w postaci, którą model rozumie bez naszych enumów. */
export interface AiLibraryEntry {
  id: string;
  name: string;
  description: string;
  category: string | null;
  /** Słowami: „za m²", „według pomieszczeń", „indywidualnie". */
  pricing: string;
  /** Grosze; `null` = indywidualnie / bez ceny. */
  priceCents: number | null;
}

export interface BriefToQuotePayload {
  brief: { questions: Array<{ section: string; question: string; answer: string }> };
  library: AiLibraryEntry[];
  templates: Array<{ id: string; name: string; itemNames: string[] }>;
  roomTypes: Array<{ id: string; name: string }>;
}

export interface AiQuoteItemView {
  id: string;
  name: string;
  enabled: boolean;
  qty: number;
  /** Sformatowana kwota pozycji („1 200,00 zł") albo „indywidualnie". */
  amount: string;
  roomLabel: string | null;
}

export interface CommentsToChangesPayload {
  comment: string;
  quote: {
    rooms: Array<{ id: string; label: string; qty: number }>;
    sections: Array<{
      id: string;
      title: string;
      items: AiQuoteItemView[];
      groups: Array<{ id: string; name: string; items: AiQuoteItemView[] }>;
    }>;
  };
  library: AiLibraryEntry[];
}

export interface PolishTextPayload {
  field: PolishField;
  text: string;
  context: {
    companyName: string;
    itemName?: string;
    rooms?: string[];
  };
}

/**
 * Wiadomość od klienta → teczka (T-140). `message` jest już PO
 * `maskContacts` — e-mail i telefon nigdy nie opuszczają aplikacji.
 * `knownClient` jest ustawiony, gdy akcja startuje z karty istniejącego
 * klienta: model nie zgaduje wtedy, kto pisze, tylko czyta o inwestycji.
 */
export interface MessageToProjectPayload {
  message: string;
  knownClient: { name: string; city: string } | null;
  library: AiLibraryEntry[];
  templates: Array<{ id: string; name: string; itemNames: string[] }>;
  roomTypes: Array<{ id: string; name: string }>;
}

export type AiPayloadOf<A extends AiAction> = A extends 'import-library'
  ? ImportLibraryPayload
  : A extends 'brief-to-quote'
    ? BriefToQuotePayload
    : A extends 'comments-to-changes'
      ? CommentsToChangesPayload
      : A extends 'message-to-project'
        ? MessageToProjectPayload
        : PolishTextPayload;

// ---------------------------------------------------------------------------
// Budowniczy
// ---------------------------------------------------------------------------

const PRICING_WORDS: Record<PricingChoiceId, string> = {
  flat_lump: 'kwota stała',
  flat_m2: 'za m²',
  per_room: 'według pomieszczeń',
  per_frame: 'za kadr',
  flat_hour: 'za godzinę',
  flat_visit: 'za wizytę',
  flat_element: 'za element',
  flat_custom: 'za własną jednostkę',
  individual: 'indywidualnie',
};

/** Słowny opis sposobu wyceny — do promptu i do podglądu propozycji. */
export function pricingChoiceWords(id: PricingChoiceId, unitLabel?: string | null): string {
  if (id === 'flat_custom' && unitLabel) return `za ${unitLabel}`;
  return PRICING_WORDS[id];
}

export const PRICING_CHOICE_GLOSSARY = PRICING_CHOICES.map((choice) => ({
  id: choice.id,
  words: PRICING_WORDS[choice.id],
}));

type LibraryLike = {
  id: string;
  name: string;
  description: string;
  unitPriceCents: number | null;
  unit: Unit;
  unitLabel?: string | null;
  pricing: PricingRule;
  categoryId: string | null;
  active?: boolean;
};

/** Biblioteka w postaci dla modelu — bez identyfikatorów workspace'u i flag. */
export function libraryEntries(
  items: readonly LibraryLike[],
  categories: ReadonlyMap<string, Pick<LibraryCategory, 'code' | 'name'>>,
  limitDescription = 200,
): AiLibraryEntry[] {
  return items
    .filter((item) => item.active !== false)
    .map((item) => {
      const choice = pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents);
      const category = item.categoryId ? categories.get(item.categoryId) : undefined;
      return {
        id: item.id,
        name: item.name,
        description: item.description.slice(0, limitDescription),
        category: category ? categoryLabel(category) : null,
        pricing: pricingChoiceWords(choice, item.unitLabel),
        priceCents: choice === 'individual' ? null : item.unitPriceCents,
      };
    });
}

/**
 * Brief jako pytania i odpowiedzi — model nie dostaje tokenu, dat ani
 * liczników wejść, bo nic z tego nie mówi o zakresie projektu.
 */
export function briefQuestions(
  brief: Pick<Brief, 'template' | 'answers'>,
): BriefToQuotePayload['brief'] {
  const questions: BriefToQuotePayload['brief']['questions'] = [];
  for (const section of brief.template) {
    for (const question of section.questions) {
      const raw = brief.answers[question.id];
      const answer = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
      if (!answer.trim()) continue;
      questions.push({ section: section.title, question: question.label, answer: answer.trim() });
    }
  }
  return { questions };
}

function itemView(
  item: Item,
  rooms: QuoteBody['rooms'],
  context: PricingContext,
  currency: string,
): AiQuoteItemView {
  const room = item.roomId ? rooms.find((candidate) => candidate.id === item.roomId) : null;
  return {
    id: item.id,
    name: item.name,
    enabled: item.enabled,
    qty: item.qty,
    // Ta sama kalkulacja co w podsumowaniu (`calcItemCents`): cennik per
    // pomieszczenie, tryb godzinowy i nadpisanie ręczne liczą się tu tak samo
    // jak w edytorze — model ma dostać kwotę, którą widzi klient, a nie
    // `cena × ilość` liczone na skróty.
    amount: isIndividualItem(item)
      ? 'indywidualnie'
      : formatMoney(calcItemCents(item, rooms, context), currency),
    roomLabel: room?.label ?? null,
  };
}

/**
 * Struktura wyceny dla modelu: identyfikatory, nazwy, stan włączenia, kwota.
 * Bez danych klienta z `body.client` — uwagi dotyczą pozycji, nie osoby.
 */
export function quoteView(body: QuoteBody, currency = 'PLN'): CommentsToChangesPayload['quote'] {
  const context = pricingContextOf(body);
  return {
    rooms: body.rooms.map((room) => ({ id: room.id, label: room.label, qty: room.qty })),
    sections: body.sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.items.map((item) => itemView(item, body.rooms, context, currency)),
      groups: section.groups.map((group) => ({
        id: group.id,
        name: group.name,
        items: group.items.map((item) => itemView(item, body.rooms, context, currency)),
      })),
    })),
  };
}
