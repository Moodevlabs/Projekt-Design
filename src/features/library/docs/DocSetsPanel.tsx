import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import { DocSetCard } from './DocSetCard';
import {
  useCreateDocSet,
  useDeleteDocSet,
  useDocSets,
  useUpdateDocSet,
} from '@/data/queries/useLibraryDocGroups';
import type { DocLibraryKind } from '@/domain/library/doc-entries';
import type { DocLibrarySet } from '@/domain/library/doc-groups';
import { pl } from '@/i18n/pl';

/**
 * Podzakładka „Zestawy" biblioteki dokumentu (T-121).
 *
 * Zestaw to gotowy komplet wpisów — „typowy proces", „sam nadzór" — wstawiany
 * do dokumentu jednym gestem. Bliźniak `LibraryGroupsTab` z usług.
 */
export function DocSetsPanel<K extends DocLibraryKind>({ kind }: { kind: K }) {
  const [pendingDelete, setPendingDelete] = useState<DocLibrarySet<K> | null>(null);

  const sets = useDocSets(kind);
  const create = useCreateDocSet(kind);
  const update = useUpdateDocSet(kind);
  const remove = useDeleteDocSet(kind);

  const rows = sets.data ?? [];

  const add = () =>
    create.mutate(
      { name: pl.library.docs.sets.newName, sortOrder: rows.length },
      { onError: (error) => toast.error(error.message) },
    );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button type="button" disabled={create.isPending} onClick={add}>
          <Plus className="size-4" aria-hidden />
          {pl.library.docs.sets.add}
        </Button>
      </div>

      {sets.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {pl.library.docs.sets.loadError}{' '}
            <button
              type="button"
              onClick={() => void sets.refetch()}
              className="underline underline-offset-4"
            >
              {pl.common.retry}
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {sets.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {!sets.isLoading && !sets.isError && rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={pl.library.docs.sets.emptyTitle}
          description={pl.library.docs.sets.emptyDescription}
          action={<Button onClick={add}>{pl.library.docs.sets.add}</Button>}
        />
      ) : null}

      {rows.length > 0 ? (
        // `items-start` jest konieczne, nie kosmetyczne: domyślne `stretch`
        // dałoby wszystkim kartom w wierszu wysokość najwyższej, więc
        // rozwinięcie JEDNEGO zestawu rozciągałoby sąsiednie (pułapka z T-10).
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((set) => (
            <DocSetCard
              key={set.id}
              kind={kind}
              set={set}
              saving={update.isPending}
              onRename={(name) => update.mutate({ id: set.id, patch: { name } })}
              onItemsChange={(items) => update.mutate({ id: set.id, patch: { items } })}
              onDelete={() => setPendingDelete(set)}
            />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pl.library.docs.sets.deleteTitle}
        description={
          pendingDelete ? pl.library.docs.sets.deleteDescription(pendingDelete.name) : undefined
        }
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
