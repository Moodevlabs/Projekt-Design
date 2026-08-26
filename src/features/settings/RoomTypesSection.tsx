import { useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared';
import {
  useCreateRoomType,
  useDeleteRoomType,
  useRoomTypes,
  useUpdateRoomType,
} from '@/data/queries/useRoomTypes';
import { slugifyRoomType, type RoomType } from '@/data/repos/room-types.repo';
import { pl } from '@/i18n/pl';

/**
 * Słownik typów pomieszczeń (F1.2) — kuchnia, salon, łazienka…
 *
 * To po nich cennik parametryczny trafia w odpowiednią kolumnę macierzy.
 * Dlatego przy zmianie nazwy **nie ruszamy `slug`a**: to klucz techniczny,
 * po którym reguły cenowe i zapisane wyceny znajdują swój typ. Poprawka
 * literówki w nazwie nie ma prawa wyzerować cen w dokumentach.
 */
export function RoomTypesSection({ canWrite }: { canWrite: boolean }) {
  const roomTypes = useRoomTypes();
  const create = useCreateRoomType();
  const [nowa, setNowa] = useState('');

  const dodaj = () => {
    const name = nowa.trim();
    if (!name) return;

    const slug = slugifyRoomType(name);
    if (roomTypes.data?.some((typ) => typ.slug === slug)) {
      toast.error(pl.settings.roomTypeDuplicate);
      return;
    }

    // Nowy typ ląduje na końcu listy — kolejność jest decyzją użytkownika,
    // a nie alfabetu.
    const sortOrder = Math.max(0, ...(roomTypes.data ?? []).map((typ) => typ.sortOrder)) + 1;

    create.mutate(
      { name, sortOrder },
      {
        onSuccess: () => setNowa(''),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <section className="card-surface space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="text-ink text-sm font-semibold">{pl.settings.roomTypes}</h2>
        <p className="text-ink-soft text-sm">{pl.settings.roomTypesHint}</p>
      </div>

      {roomTypes.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 rounded-[var(--radius-control)]" />
          <Skeleton className="h-9 rounded-[var(--radius-control)]" />
        </div>
      ) : (
        <ul className="space-y-1.5">
          {(roomTypes.data ?? []).map((typ) => (
            <RoomTypeRow key={typ.id} roomType={typ} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {!roomTypes.isLoading && (roomTypes.data ?? []).length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.settings.roomTypesEmpty}</p>
      ) : null}

      {canWrite ? (
        <div className="flex items-center gap-2">
          <Input
            value={nowa}
            placeholder={pl.settings.roomTypeNamePlaceholder}
            onChange={(event) => setNowa(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                dodaj();
              }
            }}
          />
          <Button type="button" onClick={dodaj} disabled={!nowa.trim() || create.isPending}>
            <Plus className="size-4" aria-hidden />
            {pl.common.add}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function RoomTypeRow({ roomType, canWrite }: { roomType: RoomType; canWrite: boolean }) {
  const update = useUpdateRoomType();
  const remove = useDeleteRoomType();
  const [name, setName] = useState(roomType.name);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const zapisz = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === roomType.name) {
      setName(roomType.name);
      return;
    }
    update.mutate(
      { id: roomType.id, patch: { name: trimmed } },
      { onError: (error) => toast.error(error.message) },
    );
  };

  return (
    <li className="border-hair flex items-center gap-2 rounded-[var(--radius-control)] border px-2 py-1.5">
      <GripVertical className="text-ink-soft size-4 shrink-0" aria-hidden />
      <Input
        value={name}
        disabled={!canWrite}
        aria-label={pl.settings.roomTypeName(roomType.name)}
        className="h-8 border-transparent bg-transparent px-1.5 shadow-none focus-visible:border-hair-strong"
        onChange={(event) => setName(event.target.value)}
        onBlur={zapisz}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') setName(roomType.name);
        }}
      />
      {/* Slug pokazujemy wprost — inaczej „klucz, który się nie zmienia"
          byłby niewidzialny, a to po nim ludzie dopasowują import z arkusza. */}
      <code className="text-ink-soft shrink-0 text-[11px]">{roomType.slug}</code>
      {canWrite ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label={pl.settings.roomTypeRemove(roomType.name)}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.settings.roomTypeRemoveTitle}
        description={pl.settings.roomTypeRemoveDescription(roomType.name)}
        confirmLabel={pl.common.delete}
        onConfirm={() =>
          remove.mutate(roomType.id, { onError: (error) => toast.error(error.message) })
        }
      />
    </li>
  );
}
