import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineText } from './InlineText';

function setup(value = 'Blat kuchenny') {
  const onCommit = vi.fn();
  render(<InlineText value={value} onCommit={onCommit} ariaLabel="Nazwa" />);
  return { onCommit, input: screen.getByLabelText('Nazwa') };
}

describe('InlineText', () => {
  it('zapisuje po opuszczeniu pola', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.clear(input);
    await user.type(input, 'Blat kamienny');
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith('Blat kamienny');
  });

  it('Enter zatwierdza', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.click(input);
    await user.keyboard(' XL{Enter}');

    expect(onCommit).toHaveBeenCalledWith('Blat kuchenny XL');
  });

  it('Escape cofa zmiane i nie zapisuje', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.click(input);
    await user.keyboard(' zmiana{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('Blat kuchenny');
  });

  it('nie zapisuje, gdy nic sie nie zmienilo', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.click(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
  });
});
