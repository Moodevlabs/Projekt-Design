import { create } from 'zustand';

/** Gdzie mają trafić dobrane usługi: sekcja albo grupa w sekcji. */
export interface ScopeTarget {
  sectionId: string;
  groupId: string | null;
  /**
   * „Wszystkie pomieszczenia" (T-129): usługa trafia do bloku KAŻDEGO
   * pomieszczenia sekcji (bloki powstają same). Wyklucza `groupId`.
   */
  allRooms?: boolean;
}

interface ScopePanelState {
  open: boolean;
  target: ScopeTarget | null;
  openFor: (target: ScopeTarget) => void;
  setTarget: (target: ScopeTarget) => void;
  close: () => void;
}

/**
 * Stan panelu „Dodaj usługi” (T-71).
 *
 * Osobny, malutki store zamiast propsów: `SectionBlock` i `GroupBlock` są
 * zmemoizowane, a każdy nowy callback z rodzica przerysowywałby wszystkie
 * wiersze przy każdej literze (pułapka z T-39). Akcja ze store'u ma stałą
 * referencję, więc blok może ją wziąć sam, bez zmiany propsów.
 */
export const useScopePanel = create<ScopePanelState>()((set) => ({
  open: false,
  target: null,
  openFor: (target) => set({ open: true, target }),
  setTarget: (target) => set({ target }),
  close: () => set({ open: false }),
}));
