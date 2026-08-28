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
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { docEntrySummary } from '@/features/library/docs/doc-entry-summary';
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
  const [search, setSearch] = useState('');
  const [added, setAdded] = useState<Record<string, number>>({});
  const t = pl.editor.docLibrary;

  const visible = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    if (!phrase) return library.entries;
    return library.entries.filter((entry) =>
      `${entry.name} ${docEntrySummary(kind, entry.payload)}`.toLowerCase().includes(phrase),
    );
  }, [library.entries, kind, search]);

  const finish = () => {
    onOpenChange(false);
    setAdded({});
    setSearch('');
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
            disabled={visible.length === 0}
            onClick={addAll}
          >
            <Plus className="size-3.5" aria-hidden />
            {t.addAll(visible.length)}
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {library.isLoading ? (
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
