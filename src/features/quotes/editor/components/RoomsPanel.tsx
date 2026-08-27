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
 * ## Przebudowa 2026-08-27 (poprawka 7)
 *
 * Panel był listą wierszy z polem tekstowym, „× 1" i dwoma kwadracikami
 * podpisanymi **W** i **T**. Nie mówił ani po co tu jest, ani co robią te
 * litery — legenda stała jedną linijką pod spodem, w kolorze podpowiedzi,
 * i czytało się ją dopiero wtedy, gdy było już za późno.
 *
 * Teraz mówi trzy rzeczy, w kolejności, w jakiej się o nie pyta:
 *  1. **Po co ta lista** — jedno zdanie na górze, tylko w trybie edycji.
 *  2. **Co znaczą kolumny** — główka nad wierszami, a nie przypis pod nimi.
 *  3. **Co z tego wynika** — podsumowanie „ile liczy się do której części",
 *     czyli dokładnie ta liczba, którą bierze cennik.
 *
 * Poza trybem edycji pokazujemy panel tylko wtedy, gdy jakieś pomieszczenia
 * są: w podglądzie pusty panel byłby samym szumem.
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

  // Liczymy SZTUKI, nie wiersze: „Sypialnia × 3" to trzy pomieszczenia i tyle
  // samo bierze cennik. Wiersz z ilością 3 pokazany jako „1" kłamałby o kwocie.
  const visual = rooms.filter((room) => room.includedInVisual).reduce((sum, r) => sum + r.qty, 0);
  const technical = rooms
    .filter((room) => room.includedInTechnical)
    .reduce((sum, r) => sum + r.qty, 0);
  const total = rooms.reduce((sum, room) => sum + room.qty, 0);

  return (
    <section className="card-surface flex flex-col gap-2 p-4">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-ink text-sm font-semibold">{pl.editor.rooms}</h2>
        {rooms.length > 0 ? (
          <span className="text-ink-soft tabular text-xs">{pl.editor.roomsCount(total)}</span>
        ) : null}
      </header>

      {editing ? <p className="text-ink-soft text-xs">{pl.editor.roomsPurpose}</p> : null}

      {rooms.length === 0 ? (
        <p className="text-ink-soft text-xs">{pl.editor.roomsEmpty}</p>
      ) : (
        <>
          {/*
            Główka kolumn — te same wersaliki co nad tabelami w reszcie
            aplikacji. Bez niej „× 1" i dwa kwadraciki nie mają podpisu
            w miejscu, w którym się na nie patrzy.
          */}
          <div className="text-ink-soft flex items-center gap-1.5 text-[10px] tracking-[0.08em] uppercase">
            <span className="min-w-0 flex-1">{pl.editor.roomsColumnName}</span>
            <span className="w-12 shrink-0 text-right">{pl.editor.roomsColumnQty}</span>
            <span className="w-[22px] shrink-0" aria-hidden />
          </div>

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

          {/*
            Konsekwencja flag, liczbami. To jedyne miejsce, w którym widać,
            że odznaczenie „T" przy łazience zmieniło coś w cenie — sam
            kwadracik pokazuje tylko własny stan.
          */}
          <p className="text-ink-soft border-hair border-t pt-2 text-xs">
            {pl.editor.roomsSplit(visual, technical)}
          </p>
        </>
      )}

      {editing ? (
        <>
          <button
            type="button"
            // `() => onAdd()`, a NIE `onAdd`: React przekazuje handlerowi
            // obiekt zdarzenia, ktory trafialby do dokumentu jako dane
            // pomieszczenia i psul zapis (struktura cykliczna w JSON).
            onClick={() => onAdd()}
            className="focus-visible:ring-ring inline-flex items-center gap-1 self-start rounded-[3px] text-[12.5px] font-semibold text-[var(--doc-sage)] transition-colors hover:text-[var(--doc-ink)] focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden />
            {pl.editor.addRoom}
          </button>
          <p className="text-ink-soft text-xs">{pl.editor.roomFlagsHint}</p>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title={pl.editor.removeRoomTitle}
        description={pl.editor.removeRoomDescription(pendingRemove?.label || pl.editor.newRoomName)}
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
