import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { current } from 'immer';
import {
  moveGroup as moveGroupIn,
  moveItem as moveItemIn,
  moveSection as moveSectionIn,
  newGroup,
  newItem,
  newSection,
  convertItemUnits,
  type Group,
  type Item,
  type QuoteBody,
  type MoveGroupArgs,
  type MoveItemArgs,
  type MoveSectionArgs,
  type Discount,
  type PricingBasis,
  type PricingRule,
  type QuoteStatus,
  type Room,
  type Section,
} from '@/domain/quote';
import { newId } from '@/domain/id';
import type { Quote } from '@/data/repos/quotes.repo';

/**
 * Pola, które kaskadują z biblioteki do wyceny. Świadomie WĄSKI zestaw:
 * `enabled`, `qty` i kolejność należą do konkretnej wyceny, nie do biblioteki,
 * więc edycja wpisu bibliotecznego nie ma prawa ich nadpisać.
 *
 * `pricing` należy do biblioteki (to opis usługi, nie decyzja w ofercie),
 * dlatego kaskaduje — inaczej poprawka stawki za pomieszczenie omijałaby
 * wyceny, w których ta usługa już jest.
 */
/**
 * Wariant do wstawienia w wiersz. Swiadomie WASKI zestaw pol — wszystko poza
 * nim (ilosc, TAK/NIE, pomieszczenie) nalezy do wyceny, nie do biblioteki.
 */
export interface ItemVariant {
  libraryItemId: string;
  name: string;
  description: string;
  unitPriceCents: number;
  pricing: PricingRule;
}

export type LibraryCascadePatch = Partial<
  Pick<Item, 'name' | 'description' | 'unitPriceCents' | 'pricing'>
>;

/**
 * Ile pozycji dokumentu pochodzi z danej pozycji biblioteki.
 * Czysta funkcja — UI pyta o to PRZED pokazaniem pytania o kaskadę, żeby nie
 * zawracać głowy dialogiem, gdy nie ma czego aktualizować.
 */
export function countLinkedItems(body: QuoteBody | null, libraryItemId: string): number {
  if (!body) return 0;
  return itemLists(body)
    .flat()
    .filter((item) => item.libraryItemId === libraryItemId).length;
}

/** Stan wskaznika zapisu przy numerze wyceny (05-UI §3). */
export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export type EditorMode = 'edit' | 'preview';

export interface EditorState {
  quoteId: string | null;
  number: string | null;
  status: QuoteStatus;
  body: QuoteBody | null;
  /**
   * `updated_at` wiersza, na ktorym pracujemy. Autozapis wysyla go jako podstawe
   * blokady optymistycznej — patrz `quotes.repo.saveQuote`.
   */
  lastSeenUpdatedAt: string | null;

  mode: EditorMode;
  saveState: SaveState;
  lastSavedAt: string | null;
  saveError: string | null;
  /**
   * Konflikt jest **trwaly** — zwykle mutacje go nie kasuja, tylko `load()`.
   * Bez tego kolejna edycja przestawilaby `saveState` na `dirty`, autozapis
   * ruszylby ponownie i nadpisal zmiany zrobione w innym miejscu.
   */
  hasConflict: boolean;

  // --- cykl zycia ---
  load: (quote: Quote) => void;
  reset: () => void;
  setMode: (mode: EditorMode) => void;
  /**
   * Status dokumentu po zmianie z zewnatrz (np. „oznacz jako wyslana" po
   * eksporcie). Store trzyma go osobno od cache zapytan, wiec bez tej akcji
   * pasek edytora pokazywalby stary status az do przeladowania strony.
   *
   * NIE brudzi dokumentu: status siedzi w kolumnie, nie w `body`, wiec
   * autozapis nie ma tu czego zapisywac.
   */
  setStatus: (status: QuoteStatus) => void;

  // --- zapis ---
  markSaving: () => void;
  markSaved: (updatedAt: string, savedAt: string) => void;
  markError: (message: string) => void;
  markConflict: () => void;

  // --- naglowek ---
  setNumber: (number: string) => void;
  patchHeader: (patch: Partial<QuoteBody>) => void;
  patchClient: (patch: Partial<QuoteBody['client']>) => void;

  // --- struktura ---
  addSection: () => void;
  renameSection: (sectionId: string, title: string) => void;
  removeSection: (sectionId: string) => void;

  addGroup: (sectionId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  removeGroup: (groupId: string) => void;

  // --- pomieszczenia (T-35): wymiar, po którym liczy się cennik parametryczny ---
  addRoom: (partial?: Partial<Room>) => void;
  updateRoom: (roomId: string, patch: Partial<Room>) => void;
  /** Usuwa pomieszczenie i odpina od niego pozycje — patrz komentarz w implementacji. */
  removeRoom: (roomId: string) => void;

  /**
   * Zakłada w sekcji blok (grupę) dla każdego pomieszczenia, którego jeszcze
   * nie ma. Zwraca liczbę utworzonych bloków — UI mówi użytkownikowi, co się
   * stało, zamiast po cichu dorzucać wiersze.
   */
  addRoomBlocks: (sectionId: string) => void;
  /** Wstawia kopię pozycji do każdego bloku pomieszczenia w sekcji. */
  insertItemToRoomBlocks: (sectionId: string, item: Item) => void;

  // --- rabaty (T-36): osobny byt, nie pozycja wyceny ---
  addDiscount: (partial?: Partial<Discount>) => void;
  updateDiscount: (discountId: string, patch: Partial<Discount>) => void;
  removeDiscount: (discountId: string) => void;
  toggleDiscount: (discountId: string) => void;

  /**
   * Wlacza albo wylacza wszystkie pozycje grupy naraz.
   * Jedna akcja, nie petla po `toggleItem` — inaczej w historii zmian
   * (i w autozapisie) zrobiloby sie z tego kilkanascie osobnych operacji.
   */
  toggleGroup: (groupId: string) => void;

  /** `groupId: null` = pozycja lezy luzem w sekcji. */
  addItem: (sectionId: string, groupId: string | null) => void;
  updateItem: (itemId: string, patch: Partial<Item>) => void;
  toggleItem: (itemId: string) => void;
  removeItem: (itemId: string) => void;

  /** Wstawia gotowe pozycje (np. z biblioteki) na koniec wskazanej listy. */
  insertItems: (sectionId: string, groupId: string | null, items: Item[]) => void;
  /** Wstawia gotową grupę (np. zestaw z biblioteki) na koniec sekcji. */
  insertGroup: (sectionId: string, group: Group) => void;

  /**
   * Kaskada z biblioteki (T-10): przepisuje zmienione pola na WSZYSTKIE pozycje
   * otwartej wyceny powiązane daną pozycją biblioteczną.
   *
   * Jedna akcja, nie pętla po `updateItem` — inaczej w autozapisie i w historii
   * zmian zrobiłoby się z tego kilkanaście osobnych operacji.
   */
  applyLibraryUpdate: (libraryItemId: string, patch: LibraryCascadePatch) => void;

  /**
   * Podmiana wariantu pozycji (F1.4) — np. „Wizualizacja 3D" na „360".
   *
   * Zmienia to, CO jest wycenione (nazwa, opis, cena, regula cenowa), i nie
   * rusza tego, co uzytkownik zdecydowal o TEJ wycenie: ilosci, stanu TAK/NIE,
   * przypisania do pomieszczenia ani `id` wiersza. `frames` tez zostaje —
   * powrot do wariantu `per_frame` ma pamietac liczbe kadrow.
   */
  setItemVariant: (itemId: string, variant: ItemVariant) => void;

  /**
   * Zmiana sposobu liczenia wyceny (F2.2).
   *
   * `convert: true` przelicza liczby wszystkich pozycji po stawce dokumentu;
   * `false` zostawia je bez zmian, przez co zaczynaja znaczyc co innego
   * (45 groszy staje sie 45 minutami). Oba warianty sa sensowne — pierwszy,
   * gdy ktos ma gotowa wycene i chce ja zobaczyc „od strony czasu"; drugi,
   * gdy liczby od poczatku byly minutami, tylko dokument mial zly tryb.
   *
   * Dlatego to WOLAJACY decyduje, a UI pyta. Cicha konwersja w jedna albo
   * w druga strone zepsulaby polowe przypadkow.
   */
  setPricingBasis: (basis: PricingBasis, convert: boolean) => void;

  // --- kolejność (T-09). Zmiana kolejności idzie wyłącznie przeciąganiem. ---
  moveItem: (args: MoveItemArgs) => void;
  moveGroup: (args: MoveGroupArgs) => void;
  moveSection: (args: MoveSectionArgs) => void;
}

const INITIAL = {
  quoteId: null,
  number: null,
  status: 'draft' as QuoteStatus,
  body: null,
  lastSeenUpdatedAt: null,
  mode: 'edit' as EditorMode,
  saveState: 'idle' as SaveState,
  lastSavedAt: null,
  saveError: null,
  hasConflict: false,
};

/** Znajduje sekcje zawierajaca grupe o danym id. */
function findGroup(body: QuoteBody, groupId: string): Group | undefined {
  for (const section of body.sections) {
    const group = section.groups.find((candidate) => candidate.id === groupId);
    if (group) return group;
  }
  return undefined;
}

/** Wszystkie listy pozycji w dokumencie: luzne w sekcjach + te w grupach. */
function itemLists(body: QuoteBody): Item[][] {
  const lists: Item[][] = [];
  for (const section of body.sections) {
    lists.push(section.items);
    for (const group of section.groups) lists.push(group.items);
  }
  return lists;
}

function findItem(body: QuoteBody, itemId: string): Item | undefined {
  for (const list of itemLists(body)) {
    const item = list.find((candidate) => candidate.id === itemId);
    if (item) return item;
  }
  return undefined;
}

function findSection(body: QuoteBody, sectionId: string): Section | undefined {
  return body.sections.find((section) => section.id === sectionId);
}

/**
 * Most między czystymi funkcjami z `domain/quote/reorder.ts` a szkicem immera.
 *
 * Dwie rzeczy, które trzeba tu zrobić dokładnie tak:
 *  - `current()` zdejmuje ze szkicu zwykły obiekt. Funkcje domenowe robią
 *    `structuredClone`, a proxy immera się nie sklonuje.
 *  - Domena zwraca **to samo wejście**, gdy ruch jest bezcelowy (nieznane id,
 *    krawędź listy). Porównujemy referencje i wtedy NIE brudzimy dokumentu —
 *    inaczej dojechanie przyciskiem do końca listy uruchamiałoby autozapis.
 */
function reorderWith(transform: (body: QuoteBody) => QuoteBody) {
  return (state: EditorState) => {
    if (!state.body) return;

    const before = current(state.body);
    const after = transform(before);
    if (after === before) return;

    state.body = after;
    state.saveState = 'dirty';
  };
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    ...INITIAL,

    load: (quote) =>
      set((state) => {
        state.quoteId = quote.id;
        state.number = quote.number;
        state.status = quote.status;
        state.body = quote.body;
        state.lastSeenUpdatedAt = quote.updatedAt;
        state.saveState = 'idle';
        state.saveError = null;
        // Przeladowanie to jedyny sposob na wyjscie z konfliktu.
        state.hasConflict = false;
      }),

    reset: () => set(() => ({ ...INITIAL })),

    setMode: (mode) =>
      set((state) => {
        state.mode = mode;
      }),

    setStatus: (status) =>
      set((state) => {
        state.status = status;
      }),

    markSaving: () =>
      set((state) => {
        state.saveState = 'saving';
      }),

    markSaved: (updatedAt, savedAt) =>
      set((state) => {
        state.lastSeenUpdatedAt = updatedAt;
        state.lastSavedAt = savedAt;
        state.saveState = 'saved';
        state.saveError = null;
      }),

    markError: (message) =>
      set((state) => {
        state.saveState = 'error';
        state.saveError = message;
      }),

    // Konflikt jest osobnym stanem, bo wymaga innej reakcji niz zwykly blad:
    // ponawianie zapisu nadpisaloby cudze zmiany, trzeba przeladowac.
    markConflict: () =>
      set((state) => {
        state.saveState = 'conflict';
        state.hasConflict = true;
      }),

    setNumber: (number) =>
      set((state) => {
        state.number = number;
        state.saveState = 'dirty';
      }),

    patchHeader: (patch) =>
      set((state) => {
        if (!state.body) return;
        Object.assign(state.body, patch);
        state.saveState = 'dirty';
      }),

    patchClient: (patch) =>
      set((state) => {
        if (!state.body) return;
        Object.assign(state.body.client, patch);
        state.saveState = 'dirty';
      }),

    addSection: () =>
      set((state) => {
        if (!state.body) return;
        state.body.sections.push(newSection({ title: 'Nowa sekcja' }));
        state.saveState = 'dirty';
      }),

    renameSection: (sectionId, title) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;
        section.title = title;
        state.saveState = 'dirty';
      }),

    removeSection: (sectionId) =>
      set((state) => {
        if (!state.body) return;
        state.body.sections = state.body.sections.filter((s) => s.id !== sectionId);
        state.saveState = 'dirty';
      }),

    addGroup: (sectionId) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;
        section.groups.push(newGroup({ name: 'Nowa grupa' }));
        state.saveState = 'dirty';
      }),

    renameGroup: (groupId, name) =>
      set((state) => {
        if (!state.body) return;
        const group = findGroup(state.body, groupId);
        if (!group) return;
        group.name = name;
        state.saveState = 'dirty';
      }),

    removeGroup: (groupId) =>
      set((state) => {
        if (!state.body) return;
        for (const section of state.body.sections) {
          section.groups = section.groups.filter((g) => g.id !== groupId);
        }
        state.saveState = 'dirty';
      }),

    addRoom: (partial) =>
      set((state) => {
        if (!state.body) return;
        state.body.rooms.push({
          id: newId(),
          roomTypeId: null,
          label: 'Nowe pomieszczenie',
          qty: 1,
          includedInVisual: true,
          includedInTechnical: true,
          ...partial,
        });
        state.saveState = 'dirty';
      }),

    updateRoom: (roomId, patch) =>
      set((state) => {
        if (!state.body) return;
        const room = state.body.rooms.find((candidate) => candidate.id === roomId);
        if (!room) return;
        Object.assign(room, patch);
        state.saveState = 'dirty';
      }),

    removeRoom: (roomId) =>
      set((state) => {
        if (!state.body) return;
        state.body.rooms = state.body.rooms.filter((room) => room.id !== roomId);

        // Pozycje przypięte do skasowanego pomieszczenia zostają w wycenie, ale
        // tracą przypięcie. Kasowanie ich razem z pomieszczeniem byłoby
        // zaskakujące — użytkownik usuwa POMIESZCZENIE, nie usługi; a pozostawienie
        // martwego `roomId` sprawiłoby, że pozycja `per_frame` liczyłaby się po
        // cenie nieistniejącego pomieszczenia.
        for (const list of itemLists(state.body)) {
          for (const item of list) {
            if (item.roomId === roomId) item.roomId = null;
          }
        }

        state.saveState = 'dirty';
      }),

    addRoomBlocks: (sectionId) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;

        const juzSa = new Set(
          section.groups.map((group) => group.roomId).filter((id): id is string => id !== null),
        );

        let dodane = 0;
        for (const room of state.body.rooms) {
          if (juzSa.has(room.id)) continue;
          // Nazwa bloku bierze się z pomieszczenia przy renderowaniu, ale
          // zapisujemy ją też tutaj — dzięki temu zestaw zapisany do biblioteki
          // albo wycena otwarta po usunięciu pomieszczenia dalej mają czytelny
          // nagłówek zamiast pustki.
          section.groups.push(newGroup({ name: room.label, roomId: room.id }));
          dodane += 1;
        }

        if (dodane > 0) state.saveState = 'dirty';
      }),

    insertItemToRoomBlocks: (sectionId, item) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;

        const bloki = section.groups.filter((group) => group.roomId !== null);
        if (bloki.length === 0) return;

        for (const blok of bloki) {
          // Każdy blok dostaje WŁASNĄ kopię z własnym `id` i przypięciem do
          // swojego pomieszczenia — wspólna referencja znaczyłaby, że edycja
          // jednej pozycji zmienia je wszystkie.
          blok.items.push({ ...item, id: newId(), roomId: blok.roomId });
        }

        state.saveState = 'dirty';
      }),

    addDiscount: (partial) =>
      set((state) => {
        if (!state.body) return;
        state.body.discounts.push({
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
          ...partial,
        });
        state.saveState = 'dirty';
      }),

    updateDiscount: (discountId, patch) =>
      set((state) => {
        if (!state.body) return;
        const discount = state.body.discounts.find((candidate) => candidate.id === discountId);
        if (!discount) return;
        Object.assign(discount, patch);
        state.saveState = 'dirty';
      }),

    removeDiscount: (discountId) =>
      set((state) => {
        if (!state.body) return;
        state.body.discounts = state.body.discounts.filter(
          (discount) => discount.id !== discountId,
        );
        state.saveState = 'dirty';
      }),

    toggleDiscount: (discountId) =>
      set((state) => {
        if (!state.body) return;
        const discount = state.body.discounts.find((candidate) => candidate.id === discountId);
        if (!discount) return;
        // Ten sam gest co przy pozycji: klient odznacza rabat, a nie kasuje go
        // z oferty — ma widzieć, z czego rezygnuje.
        discount.enabled = !discount.enabled;
        state.saveState = 'dirty';
      }),

    toggleGroup: (groupId) =>
      set((state) => {
        if (!state.body) return;
        const group = findGroup(state.body, groupId);
        if (!group || group.items.length === 0) return;

        // Czesc wlaczona -> wlaczamy wszystko. Wszystko wlaczone -> gasimy.
        const next = !group.items.every((item) => item.enabled);
        for (const item of group.items) item.enabled = next;
        state.saveState = 'dirty';
      }),

    addItem: (sectionId, groupId) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;
        const target = groupId
          ? section.groups.find((group) => group.id === groupId)?.items
          : section.items;
        if (!target) return;
        target.push(newItem({ name: '' }));
        state.saveState = 'dirty';
      }),

    updateItem: (itemId, patch) =>
      set((state) => {
        if (!state.body) return;
        const item = findItem(state.body, itemId);
        if (!item) return;
        Object.assign(item, patch);
        state.saveState = 'dirty';
      }),

    setPricingBasis: (basis, convert) =>
      set((state) => {
        if (!state.body) return;
        const previous = state.body.pricingBasis;
        if (previous === basis) return;

        if (convert) {
          const rate = state.body.hourlyRateCents;
          for (const items of itemLists(state.body)) {
            for (const item of items) {
              const przeliczona = convertItemUnits(current(item), previous, basis, rate);
              // `null` = brak stawki, czyli brak kursu wymiany. Zostawiamy
              // pozycję nietkniętą zamiast wpisywać zero.
              if (!przeliczona) continue;

              // Podmieniamy TYLKO liczby cenowe: `qty`, `frames`, `enabled`
              // i pomieszczenie opisują zakres pracy, a nie jej wartość.
              item.unitPriceCents = przeliczona.unitPriceCents;
              item.pricing = przeliczona.pricing;
            }
          }
        }

        state.body.pricingBasis = basis;
        state.saveState = 'dirty';
      }),

    setItemVariant: (itemId, variant) =>
      set((state) => {
        if (!state.body) return;
        const item = findItem(state.body, itemId);
        if (!item) return;

        item.libraryItemId = variant.libraryItemId;
        item.name = variant.name;
        item.description = variant.description;
        item.unitPriceCents = variant.unitPriceCents;
        item.pricing = variant.pricing;
        state.saveState = 'dirty';
      }),

    toggleItem: (itemId) =>
      set((state) => {
        if (!state.body) return;
        const item = findItem(state.body, itemId);
        if (!item) return;
        item.enabled = !item.enabled;
        state.saveState = 'dirty';
      }),

    removeItem: (itemId) =>
      set((state) => {
        if (!state.body) return;
        for (const list of itemLists(state.body)) {
          const index = list.findIndex((item) => item.id === itemId);
          if (index !== -1) {
            list.splice(index, 1);
            state.saveState = 'dirty';
            return;
          }
        }
      }),

    insertItems: (sectionId, groupId, items) =>
      set((state) => {
        if (!state.body || items.length === 0) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;

        const target = groupId
          ? section.groups.find((group) => group.id === groupId)?.items
          : section.items;
        if (!target) return;

        target.push(...items);
        state.saveState = 'dirty';
      }),

    insertGroup: (sectionId, group) =>
      set((state) => {
        if (!state.body) return;
        const section = findSection(state.body, sectionId);
        if (!section) return;

        section.groups.push(group);
        state.saveState = 'dirty';
      }),

    applyLibraryUpdate: (libraryItemId, patch) =>
      set((state) => {
        if (!state.body) return;

        let changed = 0;
        for (const list of itemLists(state.body)) {
          for (const item of list) {
            if (item.libraryItemId !== libraryItemId) continue;
            Object.assign(item, patch);
            changed += 1;
          }
        }

        if (changed > 0) state.saveState = 'dirty';
      }),

    moveItem: (args) => set(reorderWith((body) => moveItemIn(body, args))),
    moveGroup: (args) => set(reorderWith((body) => moveGroupIn(body, args))),
    moveSection: (args) => set(reorderWith((body) => moveSectionIn(body, args))),
  })),
);
