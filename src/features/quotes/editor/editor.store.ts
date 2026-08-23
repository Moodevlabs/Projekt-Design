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
  type Group,
  type Item,
  type QuoteBody,
  type MoveGroupArgs,
  type MoveItemArgs,
  type MoveSectionArgs,
  type QuoteStatus,
  type Section,
} from '@/domain/quote';
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
