import { newId } from '../id';
import { CURRENT_BODY_VERSION } from './migrate';
import type { Group, Item, QuoteBody, Section } from './schema';

/** Fabryki obiektów domenowych — każdy nowy element dostaje własne `id`. */

/** Nowa pozycja z sensownymi wartościami domyślnymi. */
export function newItem(partial: Partial<Item> = {}): Item {
  return {
    id: newId(),
    kind: 'item',
    name: 'Nowa pozycja',
    description: '',
    qty: 1,
    unitPriceCents: 0,
    enabled: true,
    libraryItemId: null,
    // Domyślnie `flat`, czyli zachowanie sprzed cennika parametrycznego.
    pricing: { mode: 'flat' },
    roomId: null,
    ...partial,
  };
}

/** Nowa grupa (np. pomieszczenie). */
export function newGroup(partial: Partial<Group> = {}): Group {
  return {
    id: newId(),
    name: 'Nowa grupa',
    items: [],
    roomId: null,
    ...partial,
  };
}

/** Nowa sekcja wyceny. */
export function newSection(partial: Partial<Section> = {}): Section {
  return {
    id: newId(),
    title: 'Nowa sekcja',
    groups: [],
    items: [],
    ...partial,
  };
}

/** Nowy, pusty dokument wyceny. */
export function newQuoteBody(partial: Partial<QuoteBody> = {}): QuoteBody {
  return {
    // Nowy dokument rodzi się w bieżącej wersji modelu — bez tego trafiłby
    // do bazy bez stempla i przy odczycie udawał dokument sprzed wersjonowania.
    bodyVersion: CURRENT_BODY_VERSION,
    title: 'Wycena',
    subtitle: '',
    intro: '',
    projectDescription: '',
    client: { name: '', phone: '', email: '' },
    // `null` = UI pokaze `quotes.created_at`; edytor moze to nadpisac.
    issueDate: null,
    validDays: 7,
    vatRate: 23,
    pricesInclude: 'net',
    // Nowa wycena jest kwotowa; tryb godzinowy wlacza sie swiadomie (F2.2).
    pricingBasis: 'amount',
    hourlyRateCents: null,
    rooms: [],
    discounts: [],
    sections: [],
    preparedBy: '',
    showDisabledItems: true,
    ...partial,
  };
}

/**
 * Kopia dokumentu z nowymi identyfikatorami sekcji/grup/pozycji.
 * Zachowuje wszystkie dane (łącznie z klientem) — używane przy „Duplikuj wycenę”.
 */
export function duplicateQuoteBody(body: QuoteBody): QuoteBody {
  return {
    ...structuredClone(body),
    sections: regenerateSectionIds(body.sections),
  };
}

/**
 * Nowa wycena na bazie szablonu: struktura i teksty zostają, dane inwestora
 * są czyszczone (szablon nie powinien przenosić klienta z poprzedniej oferty).
 */
export function fromTemplate(body: QuoteBody): QuoteBody {
  return {
    ...duplicateQuoteBody(body),
    client: { name: '', phone: '', email: '' },
  };
}

/** Głęboka kopia sekcji z podmienionymi identyfikatorami. */
function regenerateSectionIds(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...structuredClone(section),
    id: newId(),
    items: section.items.map(cloneItemWithNewId),
    groups: section.groups.map((group) => ({
      ...structuredClone(group),
      id: newId(),
      items: group.items.map(cloneItemWithNewId),
    })),
  }));
}

function cloneItemWithNewId(item: Item): Item {
  return { ...structuredClone(item), id: newId() };
}
