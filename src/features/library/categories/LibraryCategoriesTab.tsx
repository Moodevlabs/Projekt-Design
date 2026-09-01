import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FolderTree, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { CategoryColorPicker } from './CategoryColorPicker';
import { CategoryItemsList } from './CategoryItemsList';
import {
  useCreateLibraryCategory,
  useDeleteLibraryCategory,
  useLibraryCategoryList,
  useReorderLibraryCategories,
  useUpdateLibraryCategory,
} from '@/data/queries/useLibraryCategories';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryCategory, LibraryColor } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Stała referencja — `?? []` w renderze tworzyłoby nową tablicę co przebieg. */
const EMPTY: LibraryItem[] = [];

/**
 * Zakładka „Grupy" — słownik działów porządkujących usługi (B1, T-59).
 *
 * Kolejność zmienia się strzałkami, nie przeciąganiem. `@dnd-kit` jest już
 * w projekcie (edytor wyceny), ale tam przeciąganie ma sens: układa się
 * dokument, który potem ktoś czyta. Tu chodzi o kilka wierszy słownika
 * ustawianych raz — dwa przyciski są dostępne z klawiatury i nie wymagają
 * ćwiczenia precyzji myszy.
 *
 * Od T-120 wiersz się **rozwija**. Do tej pory licznik „12 usług" był samym
 * tekstem: grupa mówiła, ile ma usług, ale nie dawała ich zobaczyć ani dopiąć,
 * a przypisanie szło wyłącznie od drugiej strony (Pozycje → usługa → select).
 * Grupa wyglądała więc na etykietę, nie na pojemnik — i tak też działała.
 */
export function LibraryCategoriesTab() {
  const categories = useLibraryCategoryList();
  const items = useAllLibraryItems();
  const create = useCreateLibraryCategory();
  const reorder = useReorderLibraryCategories();
  const [newName, setNewName] = useState('');

  const rows = categories.data ?? [];

  const allItems = useMemo(() => items.data ?? [], [items.data]);

  /**
   * Usługi grupy — z listy, którą i tak mamy w cache. Grupujemy raz, zamiast
   * filtrować w każdym wierszu: przy kilkuset usługach i kilkunastu grupach
   * filtr na wiersz to iloczyn, a lista przerysowuje się przy każdej edycji
   * nazwy w sąsiednim wierszu.
   */
  const itemsByCategory = useMemo(() => {
    const map = new Map<string, LibraryItem[]>();
    for (const item of allItems) {
      if (item.categoryId === null) continue;
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [allItems]);

  const withoutGroup = allItems.filter((item) => item.categoryId === null).length;

  const move = (index: number, delta: number) => {
    const next = [...rows];
    const target = index + delta;
    const moved = next[index];
    const swapped = next[target];
    if (!moved || !swapped) return;

    next[index] = swapped;
    next[target] = moved;
    reorder.mutate(next.map((row) => row.id));
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;

    create.mutate(
      { name, sortOrder: rows.length },
      {
        onSuccess: () => {
          setNewName('');
          toast.success(pl.library.categoryAdded);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (categories.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.library.loadError}{' '}
          <button
            type="button"
            onClick={() => void categories.refetch()}
            className="underline underline-offset-4"
          >
            {pl.common.retry}
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1">
            <label htmlFor="new-category" className="text-ink text-sm font-medium">
              {pl.library.categoryNew}
            </label>
            <Input
              id="new-category"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
              }}
              placeholder={pl.library.categoryNamePlaceholder}
            />
          </div>
          <Button onClick={add} disabled={!newName.trim() || create.isPending}>
            <Plus className="size-4" aria-hidden />
            {pl.common.add}
          </Button>
        </div>
        <p className="text-ink-soft text-xs">{pl.library.categoryHint}</p>
      </div>

      {categories.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title={pl.library.categoriesEmptyTitle}
          description={pl.library.categoriesEmptyDescription}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((category, index) => (
            <CategoryRow
              key={category.id}
              category={category}
              items={itemsByCategory.get(category.id) ?? EMPTY}
              all={allItems}
              canMoveUp={index > 0}
              canMoveDown={index < rows.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          ))}
        </ul>
      )}

      {/* „Bez grupy" nie jest wierszem słownika — to stan, w którym lądują
          usługi po usunięciu grupy. Pokazujemy licznik, żeby nie znikły
          z pola widzenia. */}
      {withoutGroup > 0 ? (
        <p className="text-ink-soft text-sm">{pl.library.withoutCategoryCount(withoutGroup)}</p>
      ) : null}
    </div>
  );
}

function CategoryRow({
  category,
  items,
  all,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  category: LibraryCategory;
  /** Usługi tej grupy. */
  items: LibraryItem[];
  /** Cała biblioteka — picker dopina także usługi z innych grup. */
  all: LibraryItem[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const update = useUpdateLibraryCategory();
  const remove = useDeleteLibraryCategory();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [code, setCode] = useState(category.code);

  const itemCount = items.length;
  const listId = `library-category-items-${category.id}`;

  const commit = (patch: { name?: string; code?: string; color?: LibraryColor | null }) => {
    update.mutate({ id: category.id, patch }, { onError: (error) => toast.error(error.message) });
  };

  return (
    <li className="card-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveUp}
            aria-label={pl.library.moveUp}
            onClick={onMoveUp}
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveDown}
            aria-label={pl.library.moveDown}
            onClick={onMoveDown}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </div>

        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onBlur={() => code !== category.code && commit({ code })}
          aria-label={pl.library.categoryCode}
          placeholder="01"
          className="w-16 text-center"
        />

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name !== category.name && commit({ name })}
          aria-label={pl.library.categoryName}
          className="min-w-40 flex-1"
        />

        <CategoryColorPicker value={category.color} onChange={(color) => commit({ color })} />

        {/* Licznik JEST przyciskiem rozwijającym (T-120). Osobna strzałka obok
            samego tekstu dawałaby dwa cele o tym samym znaczeniu, a liczba
            usług to dokładnie ta informacja, po której klika się „pokaż je". */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={
            open
              ? pl.library.categoryHideItems(category.name)
              : pl.library.categoryShowItems(category.name)
          }
          onClick={() => setOpen((previous) => !previous)}
          className="text-ink-soft hover:text-ink focus-visible:ring-ring flex w-28 items-center justify-end gap-1 rounded-[var(--radius-control)] text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none"
        >
          {pl.library.itemCount(itemCount)}
          <ChevronDown
            className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`${pl.common.delete}: ${category.name}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {open ? (
        <div id={listId}>
          <CategoryItemsList
            categoryId={category.id}
            categoryName={category.name}
            items={items}
            all={all}
          />
        </div>
      ) : null}

      {/* Dialog mówi wprost, że usługi ZOSTAJĄ — inaczej człowiek z 20
          usługami w grupie nie odważy się jej ruszyć (koncepcja §5 reguła 6). */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.library.categoryDeleteTitle}
        description={pl.library.categoryDeleteDescription(itemCount)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          remove.mutate(category.id, {
            onSuccess: () => toast.success(pl.library.categoryDeleted),
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </li>
  );
}
