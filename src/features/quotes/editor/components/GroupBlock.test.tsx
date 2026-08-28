import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { newGroup, type Group, type Room } from '@/domain/quote';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useLibrary', () => ({ useLibraryItems, useLibraryGroups }));

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
