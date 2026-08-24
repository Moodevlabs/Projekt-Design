import { useMemo, useState } from 'react';
import { Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import {
  useAllLibraryItems,
  useCreateLibraryItem,
  useDeleteLibraryItem,
  useLibraryItems,
  useUpdateLibraryItem,
} from '@/data/queries/useLibrary';
import { useLibraryCategoryList } from '@/data/queries/useLibraryCategories';
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
  // `null` = wszystkie, `'none'` = bez grupy, inaczej id grupy ze slownika.
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LibraryItem | null>(null);

  // Filtry idą do zapytania — szuka i filtruje baza, nie przeglądarka.
  const filters = useMemo(
    () => ({ search: search.trim() || undefined, categoryId: categoryId ?? undefined }),
    [search, categoryId],
  );

  const items = useLibraryItems(filters);
  // Niefiltrowana lista — wybór grupy wariantów nie może zależeć od tego, co
  // akurat jest wpisane w szukajce. Ten sam klucz zapytania obsługuje panel
  // biblioteki w edytorze, więc cache jest wspólny.
  const allItems = useAllLibraryItems();
  const categories = useLibraryCategoryList();
  const createItem = useCreateLibraryItem();
  const updateItem = useUpdateLibraryItem();
  const deleteItem = useDeleteLibraryItem();
  const cascade = useCascadePrompt();

  const rows = items.data ?? [];
  const hasFilters = categoryId !== null || search.trim().length > 0;

  /**
   * Nowa pozycja nazywa się „Nowa pozycja", więc przy wpisanej frazie nie
   * przeszłaby przez filtr i zniknęłaby zaraz po dodaniu — z zewnątrz wygląda
   * to jak przycisk, który nic nie robi. Frazę czyścimy; kategorię przeciwnie,
   * zostawiamy i wkładamy do niej pozycję, bo tam użytkownik właśnie patrzy.
   */
  const handleAdd = () => {
    setSearch('');
    // Nowa usluga trafia do grupy, na ktora czlowiek wlasnie patrzy —
    // „Wszystkie" i „Bez grupy" to nie grupy, wiec tam zostaje bez przypisania.
    const target = categoryId && categoryId !== 'none' ? categoryId : null;
    const name = categories.data?.find((row) => row.id === target)?.name;
    createItem.mutate({
      name: pl.library.newItemName,
      categoryId: target,
      ...(name ? { category: name } : {}),
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
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        count={rows.length}
        adding={createItem.isPending}
        onAdd={handleAdd}
      />

      <datalist id={CATEGORY_LIST_ID}>
        {(categories.data ?? []).map((row) => (
          <option key={row.id} value={row.name} />
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
                  setCategoryId(null);
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
