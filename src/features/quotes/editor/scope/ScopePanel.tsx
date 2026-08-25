import { useMemo, useState } from 'react';
import { Home, Plus, Search, TriangleAlert } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLibraryGroups, useLibraryItems } from '@/data/queries/useLibrary';
import { useLibraryCategoryList } from '@/data/queries/useLibraryCategories';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryColor } from '@/domain/library/schema';
import { librarySnapshotToQuoteItem } from '@/domain/library/schema';
import { newGroup, type Group, type Item, type PricingContext } from '@/domain/quote';
import { useEditorStore } from '../editor.store';
import { CategoryPills } from '../components/CategoryPills';
import { libraryRowSummary } from '../components/library-row-summary';
import { ScopeRow, SCOPE_GRID } from './ScopeRow';
import { ScopeTargetSelect } from './ScopeTargetSelect';
import { useInsertFromLibrary } from './useInsertFromLibrary';
import { useScopePanel } from './scope-panel.store';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface ScopePanelProps {
  pricing: PricingContext;
  onInsertItems: (sectionId: string, groupId: string | null, items: Item[]) => void;
  onInsertGroup: (sectionId: string, group: Group) => void;
}

type Tab = 'items' | 'sets';

/** Stała referencja — pusta lista nie ma odświeżać filtrów przy każdym renderze. */
const NO_ITEMS: LibraryItem[] = [];

/**
 * Panel „Dodaj usługi” (T-71) — zakres wyceny dobierany z **tabeli**, nie
 * z popovera.
 *
 * Inspiracja 1 pokazuje bibliotekę jako listę z kolumnami: usługa, grupa,
 * sposób wyceny, stawka. Popover z T-70 miał 340 px i te same informacje
 * musiał układać jedna pod drugą, a ostrzeżenie o braku pomieszczeń
 * powtarzał przy każdym wierszu — co zamieniało je w tło. Tu ostrzeżenie
 * jest **jedno**, nad listą, z akcją; wiersze zostają czyste.
 *
 * Zasady te same co w pickerze: kliknięcie dodaje od razu, panel zostaje
 * otwarty, ta sama usługa może wejść dwa razy (dwie wizualizacje to dwie
 * pozycje). Cel („Dodaj do”) da się zmienić bez zamykania.
 */
export function ScopePanel({ pricing, onInsertItems, onInsertGroup }: ScopePanelProps) {
  const open = useScopePanel((state) => state.open);
  const target = useScopePanel((state) => state.target);
  const close = useScopePanel((state) => state.close);

  const roomCount = useEditorStore((state) => state.body?.rooms.length ?? 0);
  const addRoom = useEditorStore((state) => state.addRoom);

  const items = useLibraryItems();
  const sets = useLibraryGroups();
  const categoryRows = useLibraryCategoryList();
  const toQuoteItem = useInsertFromLibrary(pricing);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('items');
  /** Ile razy dodano daną pozycję w tej sesji panelu. */
  const [added, setAdded] = useState<Record<string, number>>({});

  // Zestaw to grupa — nie da się go wstawić DO grupy.
  const setsAllowed = target?.groupId === null;
  const activeTab: Tab = setsAllowed ? tab : 'items';

  const colorById = useMemo(() => {
    const map = new Map<string, LibraryColor | null>();
    for (const row of categoryRows.data ?? []) map.set(row.id, row.color);
    return map;
  }, [categoryRows.data]);

  const all = useMemo(() => items.data ?? NO_ITEMS, [items.data]);

  // Kolejność grup taka, jak przychodzi z bazy (sort_order słownika), nie
  // alfabetyczna — „01. Przygotowanie" ma stać przed „02. Układ", a nie
  // tam, gdzie wypadnie z porównania liter.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of all) if (item.category) seen.add(item.category);
    return [...seen];
  }, [all]);

  const visible = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    return all.filter((item) => {
      if (category !== null && item.category !== category) return false;
      if (!phrase) return true;
      return `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(phrase);
    });
  }, [all, category, search]);

  const dependsOnRooms = visible.some((item) => libraryRowSummary(item).dependsOnRooms);
  const addedTotal = Object.values(added).reduce((sum, count) => sum + count, 0);

  /** Jedyna droga wyjścia — resetuje sesję dobierania (jak w pickerze). */
  const finish = () => {
    close();
    setAdded({});
    setSearch('');
    setCategory(null);
    setTab('items');
  };

  const addItem = (id: string) => {
    if (!target) return;
    const source = all.find((candidate) => candidate.id === id);
    if (!source) return;
    const item = toQuoteItem(source);
    if (!item) return;
    onInsertItems(target.sectionId, target.groupId, [item]);
    setAdded((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const addSet = (id: string) => {
    if (!target) return;
    const source = sets.data?.find((candidate) => candidate.id === id);
    if (!source) return;
    onInsertGroup(
      target.sectionId,
      newGroup({
        name: source.name,
        items: source.items.map((snapshot) => librarySnapshotToQuoteItem(snapshot)),
      }),
    );
    setAdded((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : finish())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl">
        <SheetHeader className="border-hair border-b px-6 pt-6 pb-4">
          <SheetTitle>{pl.editor.scopeTitle}</SheetTitle>
          <SheetDescription>{pl.editor.scopeHint}</SheetDescription>
        </SheetHeader>

        <div className="border-hair flex flex-col gap-3 border-b px-6 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-ink-soft flex items-center gap-2 text-xs font-medium">
              <span className="shrink-0">{pl.editor.scopeTarget}</span>
              <ScopeTargetSelect />
            </label>

            <div className="relative flex-1">
              <Search
                className="text-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={pl.editor.scopeSearch}
                aria-label={pl.editor.scopeSearch}
                className="h-9 pl-8"
                autoFocus
              />
            </div>

            <span className="text-ink-soft tabular shrink-0 text-xs">
              {pl.editor.scopeCount(visible.length)}
            </span>
          </div>

          {setsAllowed ? (
            <div className="flex gap-1" role="tablist">
              {(['items', 'sets'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'rounded-[var(--radius-pill)] px-3 py-1 text-xs transition-colors',
                    activeTab === value
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {value === 'items' ? pl.editor.scopeTabItems : pl.editor.scopeTabSets}
                </button>
              ))}
            </div>
          ) : null}

          {activeTab === 'items' && categories.length > 1 ? (
            <CategoryPills
              categories={categories}
              value={category}
              onChange={setCategory}
              className="flex-wrap border-b-0 px-0 py-0"
            />
          ) : null}
        </div>

        {activeTab === 'items' && dependsOnRooms ? (
          roomCount === 0 ? (
            /*
             * JEDNO ostrzeżenie nad listą, nie przy każdym wierszu. Tekst
             * mówi, jak to działa (05-UI §3a pkt 5) i daje skrót — po dodaniu
                 * pomieszczenia znika samo.
             */
            <div
              role="status"
              className="mx-6 mt-3 flex items-start gap-3 rounded-[var(--radius-control)] border border-[var(--doc-terracotta)]/40 bg-[var(--doc-danger-wash)] px-3 py-2.5"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-[var(--doc-terracotta)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-ink text-sm font-medium">{pl.editor.scopeNoRoomsTitle}</p>
                <p className="text-ink-soft text-xs">{pl.editor.scopeNoRoomsBody}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => addRoom()}
              >
                <Plus className="size-3.5" aria-hidden />
                {pl.editor.scopeNoRoomsAction}
              </Button>
            </div>
          ) : (
            <p className="text-ink-soft mx-6 mt-3 flex items-center gap-1.5 text-xs">
              <Home className="size-3.5 shrink-0" aria-hidden />
              {pl.editor.scopeRoomsOk(roomCount)}
            </p>
          )
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {activeTab === 'items' ? (
            <>
              <div
                className={cn(
                  SCOPE_GRID,
                  'text-ink-soft border-hair border-b px-3 pb-2 text-[10.5px] font-semibold tracking-[0.08em] uppercase',
                )}
              >
                <span>{pl.editor.scopeColService}</span>
                <span className="hidden sm:block">{pl.editor.scopeColGroup}</span>
                <span className="hidden sm:block">{pl.editor.scopeColMode}</span>
                <span className="hidden text-right sm:block">{pl.editor.scopeColPrice}</span>
                <span />
              </div>

              {visible.length === 0 ? (
                <p className="text-ink-soft px-3 py-8 text-center text-sm">
                  {all.length === 0 ? pl.editor.scopeLibraryEmpty : pl.editor.scopeEmpty}
                </p>
              ) : (
                <ul>
                  {visible.map((item) => (
                    <ScopeRow
                      key={item.id}
                      item={item}
                      categoryColor={
                        item.categoryId ? (colorById.get(item.categoryId) ?? null) : null
                      }
                      addedCount={added[item.id] ?? 0}
                      onAdd={() => addItem(item.id)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (sets.data ?? []).length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">{pl.editor.scopeSetsEmpty}</p>
          ) : (
            <ul>
              {(sets.data ?? []).map((set) => (
                <li
                  key={set.id}
                  className="border-hair flex items-center gap-3 border-b px-3 py-2.5"
                  data-testid="scope-set-row"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-ink truncate text-sm font-medium">{set.name}</div>
                    <div className="text-ink-soft truncate text-xs">
                      {set.items.map((snapshot) => snapshot.name).join(' · ')}
                    </div>
                  </div>
                  <span className="text-ink-soft tabular shrink-0 text-xs">
                    {pl.editor.scopeSetItems(set.items.length)}
                  </span>
                  {(added[set.id] ?? 0) > 0 ? (
                    <span className="text-ink-soft text-[11px]">
                      {pl.editor.pickerAdded(added[set.id] ?? 0)}
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={(added[set.id] ?? 0) > 0 ? 'outline' : 'default'}
                    className="h-7 px-2.5"
                    aria-label={pl.editor.scopeAddLabel(set.name)}
                    onClick={() => addSet(set.id)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    {pl.editor.scopeAdd}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-hair flex items-center justify-between gap-3 border-t px-6 py-3">
          <span className="text-ink-soft text-xs">
            {addedTotal > 0 ? pl.editor.pickerAddedSummary(addedTotal) : null}
          </span>
          <Button type="button" onClick={finish}>
            {pl.editor.pickerDone}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
