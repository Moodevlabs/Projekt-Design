import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import {
  useCreateLibraryGroup,
  useDeleteLibraryGroup,
  useLibraryGroups,
  useUpdateLibraryGroup,
} from '@/data/queries/useLibrary';
import type { LibraryGroup } from '@/domain/library/schema';
import { CardsSkeleton, LoadError } from '../components/LibraryStates';
import { LibraryGroupCard } from './LibraryGroupCard';
import { pl } from '@/i18n/pl';

export function LibraryGroupsTab() {
  const [pendingDelete, setPendingDelete] = useState<LibraryGroup | null>(null);

  const groups = useLibraryGroups();
  const createGroup = useCreateLibraryGroup();
  const updateGroup = useUpdateLibraryGroup();
  const deleteGroup = useDeleteLibraryGroup();

  const rows = groups.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={createGroup.isPending}
          onClick={() => createGroup.mutate({ name: pl.library.newGroupName })}
        >
          <Plus className="size-4" aria-hidden />
          {pl.library.addGroup}
        </Button>
      </div>

      {groups.isError ? <LoadError onRetry={() => void groups.refetch()} /> : null}

      {groups.isLoading ? <CardsSkeleton count={3} /> : null}

      {!groups.isLoading && !groups.isError && rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={pl.library.groupsEmptyTitle}
          description={pl.library.groupsEmptyDescription}
          action={
            <Button onClick={() => createGroup.mutate({ name: pl.library.newGroupName })}>
              {pl.library.addGroup}
            </Button>
          }
        />
      ) : null}

      {rows.length > 0 ? (
        // `items-start` jest tu konieczne, nie kosmetyczne. Domyślne
        // `align-items: stretch` daje wszystkim kartom w wierszu wysokość
        // najwyższej z nich, więc rozwinięcie zawartości JEDNEGO zestawu
        // rozciągało sąsiednie karty na tę samą wysokość — wyglądało to tak,
        // jakby przycisk rozwijał wszystkie grupy naraz.
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((group) => (
            <LibraryGroupCard
              key={group.id}
              group={group}
              saving={updateGroup.isPending}
              onRename={(name) => updateGroup.mutate({ id: group.id, patch: { name } })}
              onItemsChange={(items) => updateGroup.mutate({ id: group.id, patch: { items } })}
              onDelete={() => setPendingDelete(group)}
            />
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pl.library.deleteGroupTitle}
        description={
          pendingDelete ? pl.library.deleteGroupDescription(pendingDelete.name) : undefined
        }
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteGroup.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
