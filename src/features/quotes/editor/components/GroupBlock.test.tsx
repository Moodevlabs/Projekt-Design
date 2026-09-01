import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { newGroup, newItem, type Group, type Room } from '@/domain/quote';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());
/*
 * Od T-122 nagłówek grupy ma „Zapisz jako zestaw", a ten komponent trzyma
 * własne mutacje (świadomie — patrz `SaveGroupToSetButton`), więc zakładka
 * musi je tu podstawić zamiast sięgać po TanStack Query.
 */
const createGroupMutate = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useLibraryGroups,
  useSaveItemsToLibrary: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateLibraryGroup: () => ({ mutate: createGroupMutate, isPending: false }),
}));

const { GroupBlock } = await import('./GroupBlock');

/** Grupa żyje w kontekście przeciągania — bez niego `useSortable` nie ma o co pytać. */
function Dnd({ ids, children }: { ids: string[]; children: ReactNode }) {
  return (
    <DndContext>
      <SortableContext items={ids}>{children}</SortableContext>
    </DndContext>
  );
}

function setupWithRooms(group: Group, rooms: Room[]) {
  useLibraryItems.mockReturnValue({ data: [] });
  useLibraryGroups.mockReturnValue({ data: [] });

  render(
    <Dnd ids={[group.id]}>
      <GroupBlock
        group={group}
        sectionId="sekcja"
        editing
        currency="PLN"
        vatRate={23}
        pricesInclude="net"
        rooms={rooms}
        textInfo={{ rooms, client: '' }}
        pricing={AMOUNT_BASIS}
        variants={NO_VARIANTS}
        onVariantChange={vi.fn()}
        onRename={vi.fn()}
        onRemove={vi.fn()}
        onToggleGroup={vi.fn()}
        onAddItem={vi.fn()}
        onToggleItem={vi.fn()}
        onPatchItem={vi.fn()}
        onRemoveItem={vi.fn()}
      />
    </Dnd>,
  );
}

describe('GroupBlock — blok pomieszczenia', () => {
  const room = {
    id: '44444444-4444-4444-8444-444444444444',
    roomTypeId: null,
    label: 'Kuchnia',
    qty: 2,
    includedInVisual: true,
    includedInTechnical: true,
  };

  it('nazwa bloku pochodzi z pomieszczenia i pokazuje ilosc', () => {
    const group = newGroup({ name: 'Kuchnia', roomId: room.id, items: [] });
    setupWithRooms(group, [room]);

    // „Kuchnia x2” — bez tego uzytkownik nie wie, czemu cena jest podwojna.
    expect(screen.getByText('Kuchnia ×2')).toBeInTheDocument();
  });

  it('nazwy bloku NIE da sie edytowac w naglowku', () => {
    // Etykieta zyje w panelu pomieszczen; edycja tutaj rozjechalaby ja z tym,
    // co liczy cennik.
    const group = newGroup({ name: 'Kuchnia', roomId: room.id, items: [] });
    setupWithRooms(group, [room]);

    expect(screen.queryByLabelText(pl.editor.groupNameLabel)).not.toBeInTheDocument();
  });

  it('pomieszczenie odznaczone w obu czesciach jest oznaczone jako pominiete', () => {
    const wylaczone = { ...room, includedInVisual: false, includedInTechnical: false };
    const group = newGroup({ name: 'Kuchnia', roomId: wylaczone.id, items: [] });
    setupWithRooms(group, [wylaczone]);

    // Blok zostaje widoczny — ma byc jasne, DLACZEGO liczy zero.
    expect(screen.getByText(`(${pl.editor.roomBlockOff})`)).toBeInTheDocument();
  });

  it('zwykla grupa dalej ma edytowalna nazwe', () => {
    setupWithRooms(newGroup({ name: 'Prace dodatkowe', items: [] }), [room]);
    expect(screen.getByLabelText(pl.editor.groupNameLabel)).toBeInTheDocument();
  });
});

/**
 * T-122: zestaw ma powstawać z pracy, którą ktoś i tak wykonał. Do tej pory
 * `useSaveToLibrary().saveGroup` istniało z testami, ale nie było podpięte do
 * żadnego przycisku — i dlatego zakładka „Zestawy" wyglądała na porzuconą.
 */
describe('GroupBlock — „Zapisz jako zestaw" (T-122)', () => {
  it('zapisuje grupę do biblioteki jako zestaw ze snapshotami pozycji', async () => {
    const user = userEvent.setup();
    const group = newGroup({
      name: 'Kuchnia',
      items: [newItem({ name: 'Zabudowa', unitPriceCents: 300_000, qty: 2 })],
    });
    setupWithRooms(group, []);

    await user.click(
      screen.getByRole('button', { name: pl.editor.saveGroupToLibrary('Kuchnia') }),
    );

    expect(createGroupMutate).toHaveBeenCalledWith(
      {
        name: 'Kuchnia',
        items: [expect.objectContaining({ name: 'Zabudowa', qty: 2, unitPriceCents: 300_000 })],
      },
      expect.anything(),
    );
  });

  /*
   * Blok pomieszczenia to nie szablon: jego nazwa pochodzi z `Room`, a skład
   * należy do konkretnej wyceny. Zapisany jako zestaw wróciłby jako „Salon"
   * z ilościami policzonymi dla cudzego mieszkania.
   */
  it('blok pomieszczenia NIE ma czego zapisywać do biblioteki', () => {
    const room: Room = {
      id: '44444444-4444-4444-8444-444444444444',
      label: 'Salon',
      qty: 1,
      includedInVisual: true,
      includedInTechnical: true,
      roomTypeId: null,
    };
    const group = newGroup({ name: 'Salon', roomId: room.id, items: [] });
    setupWithRooms(group, [room]);

    expect(
      screen.queryByRole('button', { name: pl.editor.saveGroupToLibrary('Salon') }),
    ).not.toBeInTheDocument();
  });
});
