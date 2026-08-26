import { useState } from 'react';
import { ChevronDown, ChevronUp, FolderTree, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { CategoryColorPicker } from './CategoryColorPicker';
import {
  useCreateLibraryCategory,
  useDeleteLibraryCategory,
  useLibraryCategoryList,
  useReorderLibraryCategories,
  useUpdateLibraryCategory,
} from '@/data/queries/useLibraryCategories';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import type { LibraryCategory, LibraryColor } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

/**
 * Zakładka „Grupy" — słownik działów porządkujących usługi (B1, T-59).
 *
 * Kolejność zmienia się strzałkami, nie przeciąganiem. `@dnd-kit` jest już
 * w projekcie (edytor wyceny), ale tam przeciąganie ma sens: układa się
 * dokument, który potem ktoś czyta. Tu chodzi o kilka wierszy słownika
 * ustawianych raz — dwa przyciski są dostępne z klawiatury i nie wymagają
 * ćwiczenia precyzji myszy.
 */
export function LibraryCategoriesTab() {
  const categories = useLibraryCategoryList();
  const items = useAllLibraryItems();
  const create = useCreateLibraryCategory();
  const reorder = useReorderLibraryCategories();
  const [newName, setNewName] = useState('');

  const rows = categories.data ?? [];

  /** Licznik usług w grupie — z listy, którą i tak mamy w cache. */
  const countFor = (categoryId: string) =>
    (items.data ?? []).filter((item) => item.categoryId === categoryId).length;

  const withoutGroup = (items.data ?? []).filter((item) => item.categoryId === null).length;

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
              itemCount={countFor(category.id)}
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
  itemCount,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  category: LibraryCategory;
  itemCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const update = useUpdateLibraryCategory();
  const remove = useDeleteLibraryCategory();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [code, setCode] = useState(category.code);

  const commit = (patch: { name?: string; code?: string; color?: LibraryColor | null }) => {
    update.mutate({ id: category.id, patch }, { onError: (error) => toast.error(error.message) });
  };

  return (
    <li className="card-surface flex flex-wrap items-center gap-3 p-3">
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

      <span className="text-ink-soft w-24 text-right text-sm tabular-nums">
        {pl.library.itemCount(itemCount)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`${pl.common.delete}: ${category.name}`}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>

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
