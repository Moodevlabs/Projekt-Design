import { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocLibraryEntries } from '@/data/queries/useLibraryDocs';
import { useDocCategories, useDocSets } from '@/data/queries/useLibraryDocGroups';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { docEntrySummary } from '@/features/library/docs/doc-entry-summary';
import { CategoryPills } from '../components/CategoryPills';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Panel „Dodaj z biblioteki" dla terminu, etapów i cennika (T-103).
 *
 * Ten sam gest co „Dodaj usługi" w wycenie (`ScopePanel`, T-71): panel
 * z prawej, wyszukiwarka, kliknięcie dodaje od razu i panel zostaje otwarty,
 * ten sam wpis może wejść dwa razy. „Dodaj wszystkie" jest tu, bo dokument
 * standalone startuje pusty — pełny szablon ma być jednym kliknięciem,
 * a nie dziewiętnastoma.
 *
 * Od T-121 dochodzą dwie rzeczy z biblioteki: **filtr grup** nad listą
 * (przy dwudziestu etapach szukanie oczami przestaje działać) i zakładka
 * **Zestawy**, gdzie jedno kliknięcie wstawia cały zapisany komplet.
 * Zestaw wchodzi przez to samo `onInsert`, wpis po wpisie — dokument nie
 * musi wiedzieć, że pochodzą z jednego zestawu.
 */
export function DocLibraryPanel<K extends DocLibraryKind>({
  kind,
  open,
  onOpenChange,
  onInsert,
}: {
  kind: K;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (payload: DocLibraryPayloadByKind[K]) => void;
}) {
  const library = useDocLibraryEntries(kind);
  const categories = useDocCategories(kind);
  const sets = useDocSets(kind);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<'entries' | 'sets'>('entries');
  const [added, setAdded] = useState<Record<string, number>>({});
  const t = pl.editor.docLibrary;

  /*
   * Filtr po NAZWIE grupy, nie po `id` — `CategoryPills` jest wspólny
   * z pickerem usług i operuje na etykietach. Mapa nazwa → id byłaby tu
   * czwartym bytem po to, żeby porównać dwa napisy.
   */
  const categoryNames = useMemo(() => {
    const byId = new Map((categories.data ?? []).map((row) => [row.id, row.name]));
    return { byId, list: (categories.data ?? []).map((row) => row.name) };
  }, [categories.data]);

  const visible = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    return library.entries.filter((entry) => {
      if (category !== null) {
        const name = entry.categoryId ? categoryNames.byId.get(entry.categoryId) : null;
        if (name !== category) return false;
      }
      if (!phrase) return true;
      return `${entry.name} ${docEntrySummary(kind, entry.payload)}`
        .toLowerCase()
        .includes(phrase);
    });
  }, [library.entries, kind, search, category, categoryNames]);

  const finish = () => {
    onOpenChange(false);
    setAdded({});
    setSearch('');
    setCategory(null);
    setTab('entries');
  };

  const add = (id: string) => {
    const entry = library.entries.find((candidate) => candidate.id === id);
    if (!entry) return;
    onInsert(entry.payload);
    setAdded((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const addAll = () => {
    for (const entry of visible) add(entry.id);
  };

  /** Zestaw wchodzi wpis po wpisie — dokument nie zna pojęcia „zestaw". */
  const addSet = (id: string) => {
    const set = (sets.data ?? []).find((candidate) => candidate.id === id);
    if (!set) return;
    for (const payload of set.items) onInsert(payload);
    setAdded((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  };

  const addedTotal = Object.values(added).reduce((sum, count) => sum + count, 0);

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : finish())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-hair border-b px-6 pt-6 pb-4">
          <SheetTitle>{t.title[kind]}</SheetTitle>
          <SheetDescription>{t.hint}</SheetDescription>
        </SheetHeader>

        <div className="border-hair flex items-center gap-2 border-b px-6 py-3">
          <div className="relative flex-1">
            <Search
              className="text-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <span className="text-ink-soft tabular shrink-0 text-xs">{t.count(visible.length)}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={tab !== 'entries' || visible.length === 0}
            onClick={addAll}
          >
            <Plus className="size-3.5" aria-hidden />
            {t.addAll(visible.length)}
          </Button>
        </div>

        <div className="border-hair flex flex-col gap-2 border-b px-6 py-3">
          <div className="flex gap-1" role="tablist">
            {(['entries', 'sets'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-3 py-1 text-xs transition-colors',
                  tab === value
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-ink-soft hover:text-ink',
                )}
              >
                {value === 'entries'
                  ? pl.library.docs.subtabs.entries
                  : pl.library.docs.subtabs.sets}
              </button>
            ))}
          </div>

          {tab === 'entries' && categoryNames.list.length > 1 ? (
            <CategoryPills
              categories={categoryNames.list}
              value={category}
              onChange={setCategory}
              className="flex-wrap border-b-0 px-0 py-0"
            />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {tab === 'sets' ? (
            <SetsList
              sets={sets.data ?? []}
              added={added}
              onAdd={addSet}
              loading={sets.isLoading}
            />
          ) : library.isLoading ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">{pl.common.loading}</p>
          ) : library.isError ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--doc-terracotta)]">
              {pl.library.docs.loadError}
            </p>
          ) : visible.length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">{t.empty}</p>
          ) : (
            <ul>
              {visible.map((entry) => {
                const count = added[entry.id] ?? 0;
                return (
                  <li
                    key={entry.id}
                    data-testid="doc-library-row"
                    className={cn(
                      'border-hair flex items-center gap-3 border-b px-3 py-2.5 transition-colors',
                      count > 0 ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-ink truncate text-sm font-medium">{entry.name}</div>
                      <div className="text-ink-soft truncate text-xs">
                        {docEntrySummary(kind, entry.payload)}
                      </div>
                    </div>
                    {count > 0 ? (
                      <span className="text-ink-soft tabular flex items-center gap-1 text-xs">
                        <Check className="size-3.5" aria-hidden />
                        {t.addedTimes(count)}
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant={count > 0 ? 'ghost' : 'outline'}
                      aria-label={t.addLabel(entry.name)}
                      onClick={() => add(entry.id)}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {pl.common.add}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-hair flex items-center justify-between border-t px-6 py-3">
          <span className="text-ink-soft text-xs">
            {addedTotal > 0 ? t.addedTotal(addedTotal) : ''}
          </span>
          <Button type="button" onClick={finish}>
            {t.done}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Lista zestawów. Osobny podkomponent, bo panel i tak jest długi, a zestaw
 * potrzebuje innego wiersza niż wpis: liczy się nazwa i ile pozycji wniesie,
 * a nie streszczenie pojedynczego wpisu.
 */
function SetsList({
  sets,
  added,
  onAdd,
  loading,
}: {
  sets: { id: string; name: string; items: { name: string }[] }[];
  added: Record<string, number>;
  onAdd: (id: string) => void;
  loading: boolean;
}) {
  const t = pl.editor.docLibrary;

  if (loading) {
    return <p className="text-ink-soft px-3 py-8 text-center text-sm">{pl.common.loading}</p>;
  }

  if (sets.length === 0) {
    return (
      <p className="text-ink-soft px-3 py-8 text-center text-sm">
        {pl.library.docs.sets.emptyTitle}
      </p>
    );
  }

  return (
    <ul>
      {sets.map((set) => {
        const count = added[set.id] ?? 0;
        return (
          <li
            key={set.id}
            data-testid="doc-library-set"
            className={cn(
              'border-hair flex items-center gap-3 border-b px-3 py-2.5 transition-colors',
              count > 0 ? 'bg-surface-2' : 'hover:bg-surface-2/60',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-ink truncate text-sm font-medium">{set.name}</div>
              <div className="text-ink-soft truncate text-xs">
                {set.items.map((item) => item.name).join(' · ')}
              </div>
            </div>
            <span className="text-ink-soft tabular shrink-0 text-xs">
              {pl.library.docs.sets.itemsCount(set.items.length)}
            </span>
            {count > 0 ? (
              <span className="text-ink-soft tabular flex items-center gap-1 text-xs">
                <Check className="size-3.5" aria-hidden />
                {t.addedTimes(count)}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={count > 0 ? 'ghost' : 'outline'}
              disabled={set.items.length === 0}
              aria-label={t.addLabel(set.name)}
              onClick={() => onAdd(set.id)}
            >
              <Plus className="size-3.5" aria-hidden />
              {pl.common.add}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
