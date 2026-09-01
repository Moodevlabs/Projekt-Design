import { create } from 'zustand';

/** Którą półkę biblioteki otwiera picker: grupy (słownik) czy zestawy. */
export type GroupPickerTab = 'categories' | 'sets';

interface GroupPickerState {
  open: boolean;
  /** Sekcja, na końcu której wyląduje nowa grupa. */
  sectionId: string | null;
  tab: GroupPickerTab;
  openFor: (sectionId: string, tab: GroupPickerTab) => void;
  setTab: (tab: GroupPickerTab) => void;
  close: () => void;
}

/**
 * Stan pickera „Dodaj grupę z biblioteki" (T-120).
 *
 * Osobny store zamiast propsów — dokładnie z tego powodu, co przy
 * `scope-panel.store.ts`: `SectionBlock` jest zmemoizowany, a nowy callback
 * z rodzica przy każdej literze wpisywanej w dokumencie przerysowywałby
 * wszystkie sekcje. Akcja ze store'u ma stałą referencję.
 */
export const useGroupPicker = create<GroupPickerState>()((set) => ({
  open: false,
  sectionId: null,
  tab: 'categories',
  openFor: (sectionId, tab) => set({ open: true, sectionId, tab }),
  setTab: (tab) => set({ tab }),
  close: () => set({ open: false }),
}));
