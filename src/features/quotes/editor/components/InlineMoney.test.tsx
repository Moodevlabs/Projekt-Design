import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InlineMoney } from './InlineMoney';

/**
 * Harness odwzorowuje realne uzycie: `cents` jest kontrolowane przez rodzica
 * (w aplikacji — przez store edytora), wiec po zapisie prop faktycznie sie zmienia.
 * Bez tego kontrolowany input slusznie wracalby do wartosci rodzica.
 */
function setup(initialCents = 120_000) {
  const onCommit = vi.fn();

  function Harness() {
    const [cents, setCents] = useState(initialCents);
    return (
      <InlineMoney
        cents={cents}
        onCommit={(next) => {
          onCommit(next);
          setCents(next);
        }}
        ariaLabel="Cena"
      />
    );
  }

  render(<Harness />);
  return { onCommit, input: screen.getByLabelText<HTMLInputElement>('Cena') };
}

describe('InlineMoney', () => {
  it('pokazuje sformatowana kwote, dopoki nie edytujemy', () => {
    const { input } = setup();
    expect(input.value).toMatch(/1\s?200,00/);
  });

  it('w edycji pokazuje sama liczbe, latwiejsza do nadpisania', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    expect(input.value).toBe('1200,00');
  });

  it.each([
    ['1 200', 120_000],
    ['1200,50', 120_050],
    ['1200.5', 120_050],
    ['350', 35_000],
  ])('parsuje %s jako %i groszy', async (typed, expected) => {
    const user = userEvent.setup();
    // Start od innej kwoty, zeby kazdy przypadek byl realna zmiana.
    const { onCommit, input } = setup(1_00);

    await user.clear(input);
    await user.type(input, typed);
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith(expected);
  });

  it('formatuje po opuszczeniu pola', async () => {
    const user = userEvent.setup();
    const { input } = setup();

    await user.clear(input);
    await user.type(input, '999,9');
    await user.tab();

    expect(input.value).toMatch(/999,90/);
  });

  it('nie zapisuje, gdy kwota sie nie zmienila', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.click(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('smieci nie zeruja ceny — wraca ostatnia dobra wartosc', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.clear(input);
    await user.type(input, 'abc');
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toMatch(/1\s?200,00/);
  });

  it('Escape przywraca wartosc sprzed edycji', async () => {
    const user = userEvent.setup();
    const { onCommit, input } = setup();

    await user.click(input);
    await user.clear(input);
    await user.type(input, '5000');
    await user.keyboard('{Escape}');

    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toMatch(/1\s?200,00/);
  });
});
