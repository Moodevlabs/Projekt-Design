import { newId } from '../id';
import { CURRENT_BODY_VERSION } from './migrate';
import { DiscountSchema, QuoteLinkSchema, RoomSchema } from './schema';
import type { Discount, Group, Item, QuoteBody, QuoteLink, Room, Section } from './schema';

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
    unit: 'lump',
    enabled: true,
    libraryItemId: null,
    // Domyślnie `flat`, czyli zachowanie sprzed cennika parametrycznego.
    pricing: { mode: 'flat' },
    roomId: null,
    tags: [],
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

/**
 * Nowe pomieszczenie wyceny.
 *
 * **Czyta WYMIENIONE pola, zamiast rozsypywać `...partial`** — i to jest tu
 * sedno, nie styl. Takie akcje bywają podpinane wprost pod `onClick`, a React
 * przekazuje wtedy obiekt zdarzenia. Rozsypany do dokumentu wnosił węzły DOM
 * i włókna Reacta, przez co `JSON.stringify` przy zapisie wywalał się na
 * strukturze cyklicznej: użytkownik widział „Błąd zapisu", a jego praca
 * zostawała tylko w pamięci przeglądarki.
 *
 * Samo czytanie po nazwie **nie wystarcza**: nazwy potrafią się zderzyć
 * (`Discount.type` kontra `Event.type`, gdzie wjeżdżało `'click'`), więc wynik
 * przepuszczamy jeszcze przez schemat. Nie do przyjęcia wejście daje po prostu
 * czysty, domyślny obiekt — a dokument zostaje serializowalny.
 */
export function newRoom(partial: Partial<Room> = {}): Room {
  const domyslne: Room = {
    id: newId(),
    roomTypeId: null,
    label: 'Nowe pomieszczenie',
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
  };

  const kandydat: Room = {
    ...domyslne,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.roomTypeId === undefined ? {} : { roomTypeId: partial.roomTypeId }),
    ...(partial.label === undefined ? {} : { label: partial.label }),
    ...(partial.qty === undefined ? {} : { qty: partial.qty }),
    // Sprawdzamy `undefined`, a nie prawdziwość — świadome `false` musi przetrwać.
    ...(partial.includedInVisual === undefined
      ? {}
      : { includedInVisual: partial.includedInVisual }),
    ...(partial.includedInTechnical === undefined
      ? {}
      : { includedInTechnical: partial.includedInTechnical }),
  };

  return RoomSchema.safeParse(kandydat).data ?? domyslne;
}

/** Nowy rabat. Ta sama zasada co w `newRoom` — patrz komentarz wyżej. */
export function newDiscount(partial: Partial<Discount> = {}): Discount {
  const domyslne: Discount = {
    id: newId(),
    name: 'Rabat',
    description: '',
    enabled: true,
    type: 'fixed',
    valueCents: 0,
    scope: 'quote',
    sectionId: null,
    itemIds: [],
    condition: 'always',
    roundToCents: 0,
  };

  const kandydat: Discount = {
    ...domyslne,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.name === undefined ? {} : { name: partial.name }),
    ...(partial.description === undefined ? {} : { description: partial.description }),
    ...(partial.enabled === undefined ? {} : { enabled: partial.enabled }),
    ...(partial.type === undefined ? {} : { type: partial.type }),
    ...(partial.valueCents === undefined ? {} : { valueCents: partial.valueCents }),
    ...(partial.percent === undefined ? {} : { percent: partial.percent }),
    ...(partial.scope === undefined ? {} : { scope: partial.scope }),
    ...(partial.sectionId === undefined ? {} : { sectionId: partial.sectionId }),
    ...(partial.itemIds === undefined ? {} : { itemIds: partial.itemIds }),
    ...(partial.condition === undefined ? {} : { condition: partial.condition }),
    ...(partial.roundToCents === undefined ? {} : { roundToCents: partial.roundToCents }),
  };

  return DiscountSchema.safeParse(kandydat).data ?? domyslne;
}

/**
 * Nowy odnośnik dla klienta (T-116).
 *
 * Ta sama zasada co przy `newRoom`: czytamy WYMIENIONE pola, a wynik
 * przepuszczamy przez schemat. Fabryka bywa podpięta wprost pod `onClick`,
 * a rozsypany obiekt zdarzenia zabiłby zapis dokumentu.
 */
export function newQuoteLink(partial: Partial<QuoteLink> = {}): QuoteLink {
  const domyslne: QuoteLink = { id: newId(), label: '', url: '', note: '' };

  const kandydat: QuoteLink = {
    ...domyslne,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.label === undefined ? {} : { label: partial.label }),
    ...(partial.url === undefined ? {} : { url: partial.url }),
    ...(partial.note === undefined ? {} : { note: partial.note }),
  };

  return QuoteLinkSchema.safeParse(kandydat).data ?? domyslne;
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
    client: { name: '', phone: '', email: '', city: '' },
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
    links: [],
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
    client: { name: '', phone: '', email: '', city: '' },
    // Odnośniki do wizualizacji są własnością KONKRETNEJ inwestycji, nie
    // szablonu (T-116). Przeniesione dalej pokazałyby nowemu inwestorowi
    // folder z renderami cudzego mieszkania — dlatego szablon ich nie niesie,
    // tak samo jak nie niesie danych klienta.
    links: [],
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
