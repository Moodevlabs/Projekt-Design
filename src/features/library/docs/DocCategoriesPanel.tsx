import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FolderTree, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { CategoryColorPicker } from '@/features/library/categories/CategoryColorPicker';
import { DocCategoryEntriesList } from './DocCategoryEntriesList';
import {
  useCreateDocCategory,
  useDeleteDocCategory,
  useDocCategories,
  useReorderDocCategories,
  useUpdateDocCategory,
} from '@/data/queries/useLibraryDocGroups';
import { useDocLibrary } from '@/data/queries/useLibraryDocs';
import type { DocLibraryRow } from '@/data/repos/library-docs.repo';
import type { DocLibraryKind } from '@/domain/library/doc-entries';
import type { DocLibraryCategory } from '@/domain/library/doc-groups';
import type { LibraryColor } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/*
 * Stała referencja — `?? []` w renderze tworzyłoby nową tablicę co przebieg.
 * Typ `never[]`, a nie `DocLibraryRow<DocLibraryKind>[]`: pusta lista pasuje
 * wtedy do `DocLibraryRow<K>[]` dla KAŻDEGO `K`, więc nie trzeba jej rzutować
 * w miejscu użycia (unia rodzajów nie jest podtypem konkretnego rodzaju).
 */
const EMPTY: never[] = [];

/**
 * Podzakładka „Grupy" biblioteki dokumentu (T-121).
 *
 * Bliźniak `LibraryCategoriesTab` z usług — i celowo bliźniak, nie wspólny
 * komponent generyczny: tam wiersz niesie cenę i licznik usług, tu wpis
 * i licznik wpisów, a scalenie obu kosztowałoby cztery parametry typu
 * i jedną wspólną ścieżkę, którą trzeba by czytać dwa razy.
 *
 * Wiersz od razu jest **rozwijalny** — nauka z T-120: grupa, która pokazuje
 * tylko licznik, wygląda na etykietę i tak też działa.
 */
export function DocCategoriesPanel<K extends DocLibraryKind>({ kind }: { kind: K }) {
  const categories = useDocCategories(kind);
  const library = useDocLibrary(kind);
  const create = useCreateDocCategory(kind);
  const reorder = useReorderDocCategories(kind);
  const [newName, setNewName] = useState('');

  // Obie listy przez `useMemo`: `?? []` w ciele komponentu daje NOWĄ tablicę
  // przy każdym renderze, a obie są zależnościami niżej — bez tego mapy
  // przeliczałyby się przy każdym naciśnięciu klawisza w polu „Nowa grupa".
  const rows = useMemo(() => categories.data ?? EMPTY, [categories.data]);
  const allEntries = useMemo(() => library.data ?? EMPTY, [library.data]);

  /** Wpisy pogrupowane RAZ — filtr w każdym wierszu byłby iloczynem list. */
  const byCategory = useMemo(() => {
    const map = new Map<string, DocLibraryRow<K>[]>();
    for (const row of allEntries) {
      if (row.categoryId === null) continue;
      const list = map.get(row.categoryId) ?? [];
      list.push(row);
      map.set(row.categoryId, list);
    }
    return map;
  }, [allEntries]);

  const categoryNames = useMemo(
    () => new Map(rows.map((row) => [row.id, row.name])),
    [rows],
  );

  const withoutGroup = allEntries.filter((row) => row.categoryId === null).length;

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
          toast.success(pl.library.docs.groups.added);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (categories.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.library.docs.loadError}{' '}
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
            <label htmlFor={`new-doc-group-${kind}`} className="text-ink text-sm font-medium">
              {pl.library.docs.groups.newLabel}
            </label>
            <Input
              id={`new-doc-group-${kind}`}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
              }}
              placeholder={pl.library.docs.groups.namePlaceholder}
            />
          </div>
          <Button onClick={add} disabled={!newName.trim() || create.isPending}>
            <Plus className="size-4" aria-hidden />
            {pl.common.add}
          </Button>
        </div>
        <p className="text-ink-soft text-xs">{pl.library.docs.groups.hint}</p>
      </div>

      {categories.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title={pl.library.docs.groups.emptyTitle}
          description={pl.library.docs.groups.emptyDescription}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((category, index) => (
            <DocCategoryRow
              key={category.id}
              kind={kind}
              category={category}
              entries={byCategory.get(category.id) ?? EMPTY}
              all={allEntries}
              categoryNames={categoryNames}
              canMoveUp={index > 0}
              canMoveDown={index < rows.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          ))}
        </ul>
      )}

      {withoutGroup > 0 ? (
        <p className="text-ink-soft text-sm">
          {pl.library.docs.groups.withoutGroup(withoutGroup)}
        </p>
      ) : null}
    </div>
  );
}

function DocCategoryRow<K extends DocLibraryKind>({
  kind,
  category,
  entries,
  all,
  categoryNames,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  kind: K;
  category: DocLibraryCategory;
  entries: DocLibraryRow<K>[];
  all: DocLibraryRow<K>[];
  categoryNames: ReadonlyMap<string, string>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const update = useUpdateDocCategory(kind);
  const remove = useDeleteDocCategory(kind);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [code, setCode] = useState(category.code);

  const count = entries.length;
  const listId = `doc-category-entries-${category.id}`;

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
          aria-label={pl.library.docs.groups.code}
          placeholder="01"
          className="w-16 text-center"
        />

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name !== category.name && commit({ name })}
          aria-label={pl.library.docs.groups.name}
          className="min-w-40 flex-1"
        />

        <CategoryColorPicker value={category.color} onChange={(color) => commit({ color })} />

        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={
            open
              ? pl.library.docs.groups.hideEntries(category.name)
              : pl.library.docs.groups.showEntries(category.name)
          }
          onClick={() => setOpen((previous) => !previous)}
          className="text-ink-soft hover:text-ink focus-visible:ring-ring flex w-28 items-center justify-end gap-1 rounded-[var(--radius-control)] text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none"
        >
          {pl.library.docs.groups.entryCount(count)}
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
          <DocCategoryEntriesList
            kind={kind}
            categoryId={category.id}
            categoryName={category.name}
            entries={entries}
            all={all}
            categoryNames={categoryNames}
          />
        </div>
      ) : null}

      {/* Dialog mówi wprost, że wpisy ZOSTAJĄ — inaczej nikt z pełną grupą
          nie odważy się jej ruszyć (ta sama zasada co przy grupach usług). */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.library.docs.groups.deleteTitle}
        description={pl.library.docs.groups.deleteDescription(count)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() =>
          remove.mutate(category.id, {
            onSuccess: () => toast.success(pl.library.docs.groups.deleted),
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </li>
  );
}
