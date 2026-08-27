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
import { LibraryItemRow, ROW_GRID } from './LibraryItemRow';
import { useCascadePrompt } from './useCascadePrompt';
import type { ItemDraft } from './item-draft';
import type { LibraryColor } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Stała referencja — pusta lista nie ma przerysowywać kart przy każdym renderze. */
const EMPTY_ITEMS: LibraryItem[] = [];

export function LibraryItemsTab() {
  const [search, setSearch] = useState('');
  // `null` = wszystkie, `'none'` = bez grupy, inaczej id grupy ze slownika.
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LibraryItem | null>(null);
  /** Rozwinięty wiersz (T-72) — co najwyżej jeden naraz. */
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const colorById = useMemo(() => {
    const map = new Map<string, LibraryColor | null>();
    for (const row of categories.data ?? []) map.set(row.id, row.color);
    return map;
  }, [categories.data]);

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
    createItem.mutate(
      {
        name: pl.library.newItemName,
        // Samo `categoryId` — od T-69 nazwa grupy nie jest kopiowana do wiersza,
        // tylko rozwiazywana ze slownika przy odczycie.
        categoryId: target,
      },
      // Nowa pozycja od razu rozwinięta — inaczej „Nowa pozycja" ląduje
      // zwinięta gdzieś na liście i trzeba jej szukać, żeby ją nazwać.
      { onSuccess: (created) => setExpandedId(created.id) },
    );
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
        /*
         * Lista zwiniętych wierszy zamiast siatki rozłożonych kart (T-72).
         * Rozwinięty jest co najwyżej jeden — dwa otwarte formularze obok
         * siebie to znów ściana, a szkic zamkniętego wiersza i tak by przepadł.
         */
        <div className="card-surface overflow-hidden">
          <div className={cn(ROW_GRID, 'label-caps border-hair text-ink-soft border-b px-3 py-2')}>
            <span>{pl.library.colService}</span>
            <span className="hidden lg:block">{pl.library.colGroup}</span>
            <span className="hidden lg:block">{pl.library.colMode}</span>
            <span className="hidden text-right lg:block">{pl.library.colPrice}</span>
            <span className="text-center">{pl.library.colActive}</span>
            <span />
          </div>
          <ul>
            {rows.map((item) => (
              <LibraryItemRow
                key={item.id}
                item={item}
                categoryColor={colorById.get(item.categoryId ?? '') ?? null}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                onToggleActive={(active) => updateItem.mutate({ id: item.id, patch: { active } })}
              >
                <LibraryItemCard
                  item={item}
                  allItems={allItems.data ?? EMPTY_ITEMS}
                  categories={categories.data ?? []}
                  saving={updateItem.isPending}
                  onSave={(draft) => handleSave(item, draft)}
                  onDelete={() => setPendingDelete(item)}
                  embedded
                />
              </LibraryItemRow>
            ))}
          </ul>
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
