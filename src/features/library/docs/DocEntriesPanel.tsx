import { useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { DocEntryRow } from './DocEntryRow';
import {
  useCreateDocLibraryEntry,
  useDocLibrary,
  useReorderDocLibrary,
} from '@/data/queries/useLibraryDocs';
import { useDocCategoryMap } from '@/data/queries/useLibraryDocGroups';
import { emptyDocLibraryPayload, type DocLibraryKind } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

/**
 * Lista wpisów jednego rodzaju dokumentu (T-102) — podzakładka „Pozycje".
 *
 * Do T-120 był to cały `LibraryDocsTab`; od T-121 rodzaj ma trzy podzakładki
 * (Pozycje · Grupy · Zestawy), więc lista wyprowadziła się do własnego pliku,
 * a `LibraryDocsTab` został powłoką. Zawartość jest bez zmian.
 *
 * Kolejność strzałkami, nie przeciąganiem — ta sama decyzja co przy grupach
 * (T-59): kilka wierszy ustawianych raz nie potrzebuje DnD.
 */
export function DocEntriesPanel<K extends DocLibraryKind>({ kind }: { kind: K }) {
  const library = useDocLibrary(kind);
  const create = useCreateDocLibraryEntry(kind);
  const reorder = useReorderDocLibrary(kind);
  // Słownik grup pobierany RAZ tutaj — hook w każdym wierszu kazałby wszystkim
  // wierszom subskrybować cache grup i przerysowywać się przy każdej zmianie.
  const categories = useDocCategoryMap(kind);
  const [newName, setNewName] = useState('');

  const rows = library.data ?? [];

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
      { payload: emptyDocLibraryPayload(kind, name), sortOrder: rows.length },
      {
        onSuccess: () => {
          setNewName('');
          toast.success(pl.library.docs.added);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (library.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.library.docs.loadError}{' '}
          <button
            type="button"
            onClick={() => void library.refetch()}
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
        <p className="text-ink-soft text-sm">{pl.library.docs.intro[kind]}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1 space-y-1">
            <label htmlFor={`new-doc-${kind}`} className="text-ink text-sm font-medium">
              {pl.library.docs.newLabel}
            </label>
            <Input
              id={`new-doc-${kind}`}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') add();
              }}
              placeholder={pl.library.docs.namePlaceholder[kind]}
            />
          </div>
          <Button onClick={add} disabled={!newName.trim() || create.isPending}>
            <Plus className="size-4" aria-hidden />
            {pl.common.add}
          </Button>
        </div>
      </div>

      {library.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={pl.library.docs.emptyTitle}
          description={pl.library.docs.emptyDescription}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <DocEntryRow
              key={row.id}
              kind={kind}
              row={row}
              category={row.categoryId ? (categories.get(row.categoryId) ?? null) : null}
              canMoveUp={index > 0}
              canMoveDown={index < rows.length - 1}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
