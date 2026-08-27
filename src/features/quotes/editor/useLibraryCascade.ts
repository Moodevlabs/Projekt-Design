import { useMemo } from 'react';
import { countLinkedItems, useEditorStore, type LibraryCascadePatch } from './editor.store';

export interface LibraryCascade {
  /** Ile pozycji OTWARTEJ wyceny pochodzi z danej pozycji biblioteki. */
  linkedCount: (libraryItemId: string) => number;
  /** Przepisuje zmienione pola na wszystkie powiązane pozycje. */
  apply: (libraryItemId: string, patch: LibraryCascadePatch) => void;
}

/**
 * Pomost między biblioteką a otwartą wyceną.
 *
 * Wycena należy do edytora, więc to edytor wystawia operację, a biblioteka
 * tylko o nią prosi — odwrotny kierunek (biblioteka grzebiąca w dokumencie)
 * był właśnie tym, co w prototypie robiło z tego plątaninę.
 *
 * Celowo **nie subskrybuje** store'a: czyta stan dopiero w momencie wywołania.
 * Gdyby subskrybował `body`, strona biblioteki przerysowywałaby się przy każdym
 * naciśnięciu klawisza w edytorze.
 */
export function useLibraryCascade(): LibraryCascade {
  return useMemo(
    () => ({
      linkedCount: (libraryItemId) =>
        countLinkedItems(useEditorStore.getState().body, libraryItemId),
      apply: (libraryItemId, patch) =>
        useEditorStore.getState().applyLibraryUpdate(libraryItemId, patch),
    }),
    [],
  );
}
