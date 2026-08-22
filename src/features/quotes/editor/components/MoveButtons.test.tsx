import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoveButtons } from './MoveButtons';
import { pl } from '@/i18n/pl';

function setup(canMoveUp: boolean, canMoveDown: boolean) {
  const onMove = vi.fn();
  render(
    <MoveButtons label="Blat kuchenny" canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />,
  );
  return {
    onMove,
    up: screen.getByRole('button', { name: `${pl.editor.moveUp}: Blat kuchenny` }),
    down: screen.getByRole('button', { name: `${pl.editor.moveDown}: Blat kuchenny` }),
  };
}

describe('MoveButtons', () => {
  it('przesuwa w górę i w dół', async () => {
    const user = userEvent.setup();
    const { onMove, up, down } = setup(true, true);

    await user.click(up);
    expect(onMove).toHaveBeenCalledWith('up');

    await user.click(down);
    expect(onMove).toHaveBeenCalledWith('down');
  });

  it('wyłącza strzałkę na krańcu listy', () => {
    const { up, down } = setup(false, true);
    expect(up).toBeDisabled();
    expect(down).toBeEnabled();
  });

  it('etykieta mówi, CO zostanie przesunięte — sama strzałka nic nie znaczy dla czytnika', () => {
    const { up } = setup(true, true);
    expect(up).toHaveAccessibleName('Przesuń wyżej: Blat kuchenny');
  });

  it('da się obsłużyć z klawiatury', async () => {
    const user = userEvent.setup();
    const { onMove, up } = setup(true, true);

    up.focus();
    await user.keyboard('{Enter}');
    expect(onMove).toHaveBeenCalledWith('up');
  });

  it('wyłączona strzałka nie reaguje na klik', async () => {
    const user = userEvent.setup();
    const { onMove, up } = setup(false, true);

    await user.click(up);
    expect(onMove).not.toHaveBeenCalled();
  });
});
