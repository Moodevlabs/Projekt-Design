import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineText } from './InlineText';

function setup(value = 'Blat kuchenny') {
  const onCommit = vi.fn();
  render(<InlineText value={value} onCommit={onCommit} ariaLabel="Nazwa" />);
  return { onCommit, input: screen.getByLabelText<HTMLInputElement>('Nazwa') };
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

describe('InlineText — podgląd', () => {
  it('renderuje tekst, a nie pole formularza', () => {
    render(<InlineText value="anna.nowak@example.com" onCommit={vi.fn()} readOnly ariaLabel="E-mail" />);

    // Długie wartości muszą się zawijać — `readonly` input by je uciął.
    expect(screen.getByLabelText('E-mail')).toHaveTextContent('anna.nowak@example.com');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('pustej wartości nie renderuje wcale', () => {
    const { container } = render(
      <InlineText value="" onCommit={vi.fn()} readOnly ariaLabel="Telefon" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
