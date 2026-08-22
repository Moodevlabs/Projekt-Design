import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCreateLibraryGroup, useSaveItemsToLibrary } from '@/data/queries/useLibrary';
import { quoteItemToLibrarySnapshot } from '@/domain/library/schema';
import type { Group, Item } from '@/domain/quote';
import { useEditorStore } from './editor.store';
import { pl } from '@/i18n/pl';

export interface SaveToLibrary {
  /** Pojedyncza pozycja z wyceny. */
  saveItem: (item: Item) => void;
  /** „Zapisz wszystko z tej wyceny do biblioteki" (00-PRD §4.1). */
  saveAll: () => void;
  /** Grupa wyceny jako zestaw biblioteczny. */
  saveGroup: (group: Group) => void;
}

/** Pozycja bez nazwy nie przejdzie walidacji biblioteki — nie ma po co jej wysyłać. */
const named = (item: Item) => item.name.trim().length > 0;

/**
 * Zapisy z edytora do biblioteki, wyjęte ze strony, żeby dało się je sprawdzić
 * na prawdziwym store — tak samo jak `useLibraryCascade` w drugą stronę.
 */
export function useSaveToLibrary(): SaveToLibrary {
  const saveItems = useSaveItemsToLibrary();
  const createGroup = useCreateLibraryGroup();

  const saveItem = useCallback(
    (item: Item) => {
      saveItems.mutate(
        [
          {
            name: item.name,
            description: item.description,
            kind: item.kind,
            unitPriceCents: item.unitPriceCents,
          },
        ],
        {
          /*
           * Zapisana pozycja dostaje `libraryItemId` świeżego wpisu. Bez tego
           * haczyka kaskada z biblioteki omijałaby pozycję, z której ten wpis
           * dopiero co powstał — a to najbardziej naturalny moment, żeby chcieć
           * poprawić cenę w jednym miejscu.
           */
          onSuccess: (saved) => {
            const entry = saved[0];
            if (entry) useEditorStore.getState().updateItem(item.id, { libraryItemId: entry.id });
          },
          onError: (error) => toast.error(error.message),
        },
      );
    },
    [saveItems],
  );

  const saveAll = useCallback(() => {
    const current = useEditorStore.getState().body;
    if (!current) return;

    const items = current.sections
      .flatMap((section) => [...section.items, ...section.groups.flatMap((group) => group.items)])
      .filter(named)
      .map((item) => ({
        name: item.name,
        description: item.description,
        kind: item.kind,
        unitPriceCents: item.unitPriceCents,
      }));

    if (items.length === 0) {
      toast.info(pl.editor.saveAllToLibraryEmpty);
      return;
    }

    saveItems.mutate(items, {
      onSuccess: (saved) => toast.success(pl.editor.saveAllToLibraryDone(saved.length)),
      onError: (error) => toast.error(error.message),
    });
  }, [saveItems]);

  const saveGroup = useCallback(
    (group: Group) => {
      const name = group.name.trim();
      if (name.length === 0) {
        toast.info(pl.editor.saveGroupToLibraryUnnamed);
        return;
      }

      const items = group.items.filter(named).map(quoteItemToLibrarySnapshot);
      if (items.length === 0) {
        toast.info(pl.editor.saveGroupToLibraryEmpty);
        return;
      }

      createGroup.mutate(
        { name, items },
        {
          onSuccess: () => toast.success(pl.editor.saveGroupToLibraryDone(name)),
          onError: (error) => toast.error(error.message),
        },
      );
    },
    [createGroup],
  );

  return { saveItem, saveAll, saveGroup };
}
