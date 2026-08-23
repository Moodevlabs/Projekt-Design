import { useMemo, useState } from 'react';
import { Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import {
  useAllLibraryItems,
  useCreateLibraryItem,
  useDeleteLibraryItem,
  useLibraryCategories,
  useLibraryItems,
  useUpdateLibraryItem,
} from '@/data/queries/useLibrary';
import type { LibraryItem } from '@/data/repos/library.repo';
import { CardsSkeleton, LoadError } from '../components/LibraryStates';
import { ItemsToolbar } from './ItemsToolbar';
import { LibraryItemCard } from './LibraryItemCard';
import { useCascadePrompt } from './useCascadePrompt';
import type { ItemDraft } from './item-draft';
import { pl } from '@/i18n/pl';

const CATEGORY_LIST_ID = 'library-categories';

/** Stała referencja — pusta lista nie ma przerysowywać kart przy każdym renderze. */
const EMPTY_ITEMS: LibraryItem[] = [];

export function LibraryItemsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LibraryItem | null>(null);

  // Filtry idą do zapytania — szuka i filtruje baza, nie przeglądarka.
  const filters = useMemo(
    () => ({ search: search.trim() || undefined, category: category ?? undefined }),
    [search, category],
  );

  const items = useLibraryItems(filters);
  // Niefiltrowana lista — wybór grupy wariantów nie może zależeć od tego, co
  // akurat jest wpisane w szukajce. Ten sam klucz zapytania obsługuje panel
  // biblioteki w edytorze, więc cache jest wspólny.
  const allItems = useAllLibraryItems();
  const categories = useLibraryCategories();
  const createItem = useCreateLibraryItem();
  const updateItem = useUpdateLibraryItem();
  const deleteItem = useDeleteLibraryItem();
  const cascade = useCascadePrompt();

  const rows = items.data ?? [];
  const hasFilters = category !== null || search.trim().length > 0;

  /**
   * Nowa pozycja nazywa się „Nowa pozycja", więc przy wpisanej frazie nie
   * przeszłaby przez filtr i zniknęłaby zaraz po dodaniu — z zewnątrz wygląda
   * to jak przycisk, który nic nie robi. Frazę czyścimy; kategorię przeciwnie,
   * zostawiamy i wkładamy do niej pozycję, bo tam użytkownik właśnie patrzy.
   */
  const handleAdd = () => {
    setSearch('');
    createItem.mutate({
      name: pl.library.newItemName,
      ...(category ? { category } : {}),
    });
  };

  const handleSave = (item: LibraryItem, draft: ItemDraft) => {
    updateItem.mutate(
      { id: item.id, patch: draft },
      // Kaskadę proponujemy dopiero PO udanym zapisie — pytanie o wycenę nie ma
      // sensu, dopóki nie wiadomo, że biblioteka faktycznie się zmieniła.
      { onSuccess: (saved) => cascade.offer(item, saved) },
    );
  };

  return (
    <div className="space-y-5">
      <ItemsToolbar
        search={search}
        onSearchChange={setSearch}
        categories={categories.data ?? []}
        category={category}
        onCategoryChange={setCategory}
        adding={createItem.isPending}
        onAdd={handleAdd}
      />

      <datalist id={CATEGORY_LIST_ID}>
        {(categories.data ?? []).map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {items.isError ? <LoadError onRetry={() => void items.refetch()} /> : null}

      {items.isLoading ? <CardsSkeleton /> : null}

      {!items.isLoading && !items.isError && rows.length === 0 ? (
        <EmptyState
          icon={Library}
          title={hasFilters ? pl.library.itemsNoResultsTitle : pl.library.itemsEmptyTitle}
          description={
            hasFilters ? pl.library.itemsNoResultsDescription : pl.library.itemsEmptyDescription
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setCategory(null);
                  setSearch('');
                }}
              >
                {pl.library.clearFilters}
              </Button>
            ) : (
              <Button onClick={() => createItem.mutate({ name: pl.library.newItemName })}>
                {pl.library.addItem}
              </Button>
            )
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => (
            <LibraryItemCard
              key={item.id}
              item={item}
              allItems={allItems.data ?? EMPTY_ITEMS}
              categoryListId={CATEGORY_LIST_ID}
              saving={updateItem.isPending}
              onSave={(draft) => handleSave(item, draft)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pl.library.deleteItemTitle}
        description={
          pendingDelete ? pl.library.deleteItemDescription(pendingDelete.name) : undefined
        }
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteItem.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <ConfirmDialog
        open={cascade.prompt !== null}
        onOpenChange={(open) => {
          if (!open) cascade.dismiss();
        }}
        title={pl.library.cascadeTitle}
        description={
          cascade.prompt
            ? pl.library.cascadeDescription(cascade.prompt.count, cascade.prompt.itemName)
            : undefined
        }
        confirmLabel={pl.library.cascadeConfirm}
        cancelLabel={pl.library.cascadeDismiss}
        onConfirm={cascade.accept}
      />
    </div>
  );
}
