import { useState } from 'react';
import { Plus } from 'lucide-react';
import { RoomRow } from './RoomRow';
import { ConfirmDialog } from '@/components/shared';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import type { Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Panel pomieszczeń wyceny — nad podsumowaniem, bo to on decyduje o kwotach
 * usług liczonych za pomieszczenie.
 *
 * Poza trybem edycji pokazujemy go tylko wtedy, gdy jakieś pomieszczenia są:
 * w podglądzie pusty panel byłby samym szumem.
 */
export function RoomsPanel({
  rooms,
  editing,
  onAdd,
  onPatch,
  onRemove,
}: {
  rooms: Room[];
  editing: boolean;
  onAdd: () => void;
  onPatch: (roomId: string, patch: Partial<Room>) => void;
  onRemove: (roomId: string) => void;
}) {
  const roomTypes = useRoomTypes();
  const [pendingRemove, setPendingRemove] = useState<Room | null>(null);

  if (!editing && rooms.length === 0) return null;

  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-ink text-sm font-semibold">{pl.editor.rooms}</h2>
        {rooms.length > 0 ? (
          <span className="text-ink-soft tabular text-xs">{rooms.length}</span>
        ) : null}
      </header>

      {rooms.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.editor.roomsEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {rooms.map((room) => (
            <RoomRow
              key={room.id}
              room={room}
              roomTypes={roomTypes.data ?? []}
              onPatch={(patch) => onPatch(room.id, patch)}
              onRemove={() => setPendingRemove(room)}
            />
          ))}
        </ul>
      )}

      {editing ? (
        <>
          <button
            type="button"
            onClick={onAdd}
            className="text-[var(--doc-sage)] hover:text-[var(--doc-ink)] focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-[3px] text-[12.5px] font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden />
            {pl.editor.addRoom}
          </button>
          <p className="text-ink-soft text-xs">
            {rooms.length === 0 ? pl.editor.roomsHint : pl.editor.roomFlagsHint}
          </p>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title={pl.editor.removeRoomTitle}
        description={
          pendingRemove
            ? pl.editor.removeRoomDescription(pendingRemove.label || pl.editor.newRoomName)
            : undefined
        }
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          if (pendingRemove) onRemove(pendingRemove.id);
          setPendingRemove(null);
        }}
      />
    </section>
  );
}
