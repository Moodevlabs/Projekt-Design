import { DndContext } from '@dnd-kit/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionBlock } from './SectionBlock';
import { NO_VARIANTS } from '../useVariantOptions';
import { useGroupPicker } from '../scope/group-picker.store';
import { AMOUNT_BASIS, newSection, type Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const NO_ROOMS: Room[] = [];
const NO_TEXT = { rooms: [], client: '' };
const noop = () => undefined;

const SECTION = newSection({ title: 'Projekt' });

function setup(onAddGroup: () => void) {
  return render(
    <DndContext>
      <SectionBlock
        section={SECTION}
        editing
        currency="PLN"
        vatRate={23}
        pricesInclude="net"
        rooms={NO_ROOMS}
        textInfo={NO_TEXT}
        pricing={AMOUNT_BASIS}
        variants={NO_VARIANTS}
        onVariantChange={noop}
        onRename={noop}
        onRemove={noop}
        onAddGroup={onAddGroup}
        onAddRoomBlocks={noop}
        onRenameGroup={noop}
        onRemoveGroup={noop}
        onToggleGroup={noop}
        onAddItem={noop}
        onToggleItem={noop}
        onPatchItem={noop}
        onRemoveItem={noop}
      />
    </DndContext>,
  );
}

beforeEach(() => {
  useGroupPicker.setState({ open: false, sectionId: null, tab: 'categories' });
});

/**
 * T-120: „Dodaj grupę" prowadziło zawsze do pustej „Nowej grupy". Teraz jest
 * menu, a biblioteka stoi w nim obok pustej grupy — nie w innym panelu.
 */
describe('SectionBlock — „Dodaj grupę"', () => {
  it('daje trzy drogi, nie jedną', async () => {
    const user = userEvent.setup();
    setup(noop);

    await user.click(screen.getByRole('button', { name: pl.editor.addGroup }));

    expect(screen.getByRole('menuitem', { name: pl.editor.addGroupEmpty })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: pl.editor.addGroupFromCategory }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: pl.editor.addGroupFromSet })).toBeInTheDocument();
  });

  it('„Pusta grupa" zachowuje dotychczasowe zachowanie', async () => {
    const user = userEvent.setup();
    const onAddGroup = vi.fn();
    setup(onAddGroup);

    await user.click(screen.getByRole('button', { name: pl.editor.addGroup }));
    await user.click(screen.getByRole('menuitem', { name: pl.editor.addGroupEmpty }));

    expect(onAddGroup).toHaveBeenCalledWith(SECTION.id);
    expect(useGroupPicker.getState().open).toBe(false);
  });

  it('„Z biblioteki (grupa)" otwiera picker na właściwej półce i sekcji', async () => {
    const user = userEvent.setup();
    setup(noop);

    await user.click(screen.getByRole('button', { name: pl.editor.addGroup }));
    await user.click(screen.getByRole('menuitem', { name: pl.editor.addGroupFromCategory }));

    expect(useGroupPicker.getState()).toMatchObject({
      open: true,
      sectionId: SECTION.id,
      tab: 'categories',
    });
  });

  it('„Z biblioteki (zestaw)" otwiera tę samą kontrolkę na zestawach', async () => {
    const user = userEvent.setup();
    setup(noop);

    await user.click(screen.getByRole('button', { name: pl.editor.addGroup }));
    await user.click(screen.getByRole('menuitem', { name: pl.editor.addGroupFromSet }));

    expect(useGroupPicker.getState().tab).toBe('sets');
  });
});
