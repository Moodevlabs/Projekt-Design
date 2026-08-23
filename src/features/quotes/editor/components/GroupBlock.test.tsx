import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { newGroup, newItem, type Group, type Item } from '@/domain/quote';
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

function setup(group: Group, editing = true) {
  useLibraryItems.mockReturnValue({ data: [] });
  useLibraryGroups.mockReturnValue({ data: [] });

  const handlers = {
    onRename: vi.fn(),
    onRemove: vi.fn(),
    onToggleGroup: vi.fn(),
    onAddItem: vi.fn(),
    onToggleItem: vi.fn(),
    onPatchItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onInsertItems: vi.fn(),
    onSaveItemToLibrary: vi.fn(),
    onSaveGroupToLibrary: vi.fn(),
  };

  render(
    <Dnd ids={[group.id]}>
      <GroupBlock
        group={group}
        sectionId="sekcja"
        editing={editing}
        currency="PLN"
        vatRate={23}
        pricesInclude="net"
        rooms={[]}
        {...handlers}
      />
    </Dnd>,
  );
  return handlers;
}

function kitchen(items: Item[] = [newItem({ name: 'Zabudowa', unitPriceCents: 300_000 })]): Group {
  return newGroup({ name: 'Kuchnia', items });
}

describe('GroupBlock — zapis zestawu do biblioteki', () => {
  it('oddaje cala grupe do zapisania', async () => {
    const user = userEvent.setup();
    const group = kitchen();
    const { onSaveGroupToLibrary } = setup(group);

    await user.click(
      screen.getByRole('button', { name: `${pl.editor.saveGroupToLibrary}: Kuchnia` }),
    );

    expect(onSaveGroupToLibrary).toHaveBeenCalledWith(group);
  });

  it('pusty zestaw nie ma czego zapisac', () => {
    setup(kitchen([]));

    expect(
      screen.getByRole('button', { name: `${pl.editor.saveGroupToLibrary}: Kuchnia` }),
    ).toBeDisabled();
  });

  it('zestaw bez nazwy nie ma czego zapisac — snapshot wymaga nazwy', () => {
    setup(newGroup({ name: '', items: [newItem({ name: 'Zabudowa', unitPriceCents: 1000 })] }));

    expect(
      screen.getByRole('button', {
        name: `${pl.editor.saveGroupToLibrary}: ${pl.editor.newGroupName}`,
      }),
    ).toBeDisabled();
  });

  it('poza trybem edycji zapisu nie ma', () => {
    setup(kitchen(), false);

    expect(
      screen.queryByRole('button', { name: `${pl.editor.saveGroupToLibrary}: Kuchnia` }),
    ).not.toBeInTheDocument();
  });
});
