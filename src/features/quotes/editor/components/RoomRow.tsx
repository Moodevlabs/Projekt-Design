import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import type { RoomType } from '@/data/repos/room-types.repo';
import { nextRoomLabel, type Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Jedno pomieszczenie w panelu: nazwa, typ ze słownika, ilość i dwie flagi.
 *
 * Flagi **W** i **T** to kolumny M i A z arkusza — decydują, czy pomieszczenie
 * wlicza się do usług wizualnych, technicznych, czy obu. Skróty zamiast pełnych
 * nazw, bo wiersz musi zmieścić się w wąskiej kolumnie obok dokumentu;
 * rozwinięcie jest w `aria-label` i w podpisie panelu.
 */
export function RoomRow({
  room,
  roomTypes,
  onPatch,
  onRemove,
}: {
  room: Room;
  roomTypes: RoomType[];
  onPatch: (patch: Partial<Room>) => void;
  onRemove: () => void;
}) {
  const label = room.label || pl.editor.newRoomName;

  return (
    <li className="border-hair flex flex-col gap-1.5 border-b py-2 last:border-b-0">
      <div className="flex items-center gap-1.5">
        <InlineText
          value={room.label}
          onCommit={(value) => onPatch({ label: value })}
          placeholder={pl.editor.newRoomName}
          ariaLabel={pl.editor.roomNameLabel(label)}
          className="inline-field min-w-0 flex-1 text-[13px]"
        />

        <span className="text-ink-soft text-xs" aria-hidden>
          ×
        </span>
        <input
          type="number"
          min={1}
          step={1}
          value={room.qty}
          aria-label={pl.editor.roomQtyLabel(label)}
          onChange={(event) => {
            const next = Number(event.target.value);
            // `qty` jest w domenie `int().positive()` — zero i minus odpadają,
            // a pole na chwilę puste nie może wyzerować pomieszczenia.
            if (Number.isInteger(next) && next > 0) onPatch({ qty: next });
          }}
          className="border-hair focus-within:border-ring tabular w-12 shrink-0 rounded-[var(--radius-control)] border px-1.5 py-0.5 text-right text-[13px] outline-none"
        />

        <button
          type="button"
          aria-label={pl.editor.removeRoom(label)}
          onClick={onRemove}
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-full',
            'text-[var(--doc-ink-soft)] transition-colors',
            'hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]',
          )}
        >
          <Trash2 className="size-[13px]" aria-hidden />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <select
          value={room.roomTypeId ?? ''}
          aria-label={pl.editor.roomTypeLabel(label)}
          onChange={(event) => {
            const roomTypeId = event.target.value || null;
            const nazwaTypu = (id: string | null) =>
              roomTypes.find((type) => type.id === id)?.name ?? null;

            // Wybór typu NAZYWA pomieszczenie — patrz `nextRoomLabel`.
            onPatch({
              roomTypeId,
              label: nextRoomLabel({
                currentLabel: room.label,
                previousTypeName: nazwaTypu(room.roomTypeId),
                nextTypeName: nazwaTypu(roomTypeId),
                defaultLabel: pl.editor.newRoomName,
              }),
            });
          }}
          className="border-hair focus-within:border-ring min-w-0 flex-1 rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5 text-xs outline-none"
        >
          {/* Pusty typ znaczy „spoza słownika” — wtedy cennik bierze stawkę domyślną. */}
          <option value="">{pl.editor.roomTypeCustom}</option>
          {roomTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>

        <FlagToggle
          active={room.includedInVisual}
          label={pl.editor.roomVisual(label)}
          title={pl.editor.roomVisualTitle}
          short={pl.editor.roomVisualShort}
          onToggle={() => onPatch({ includedInVisual: !room.includedInVisual })}
        />
        <FlagToggle
          active={room.includedInTechnical}
          label={pl.editor.roomTechnical(label)}
          title={pl.editor.roomTechnicalTitle}
          short={pl.editor.roomTechnicalShort}
          onToggle={() => onPatch({ includedInTechnical: !room.includedInTechnical })}
        />
      </div>
    </li>
  );
}

function FlagToggle({
  active,
  label,
  title,
  short,
  onToggle,
}: {
  active: boolean;
  label: string;
  /** Podpowiedź pod kursorem — sama litera nic nie mówi. */
  title: string;
  short: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'size-[22px] shrink-0 rounded-[var(--radius-control)] text-[11px] font-semibold transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'bg-[var(--doc-sage)] text-white'
          : 'border-hair border text-[var(--doc-ink-soft)]',
      )}
    >
      {short}
    </button>
  );
}
