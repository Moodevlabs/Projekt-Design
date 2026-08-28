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

describe('InlineMoney nullable (T-115)', () => {
  function setupNullable(initial: number | null) {
    const onCommit = vi.fn();
    const onClear = vi.fn();

    function Harness() {
      const [cents, setCents] = useState<number | null>(initial);
      return (
        <InlineMoney
          cents={cents}
          nullable
          placeholder="wycena indywidualna"
          onCommit={(next) => {
            onCommit(next);
            setCents(next);
          }}
          onClear={() => {
            onClear();
            setCents(null);
          }}
          ariaLabel="Cena"
        />
      );
    }

    render(<Harness />);
    return { onCommit, onClear, input: screen.getByLabelText<HTMLInputElement>('Cena') };
  }

  it('`null` to puste pole z podpowiedzia, nie „0,00 zl"', () => {
    const { input } = setupNullable(null);
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', 'wycena indywidualna');
  });

  it('wpisanie kwoty w puste pole nadaje cene', async () => {
    const user = userEvent.setup();
    const { input, onCommit } = setupNullable(null);

    await user.type(input, '350');
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith(35_000);
    expect(input).toHaveValue('350,00\u00a0zł');
  });

  it('wyczyszczenie pola wola onClear, a nie zapisuje zera', async () => {
    const user = userEvent.setup();
    const { input, onCommit, onClear } = setupNullable(35_000);

    await user.clear(input);
    await user.tab();

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('bez `nullable` puste pole dalej przywraca ostatnia dobra wartosc', async () => {
    const user = userEvent.setup();
    const { input, onCommit } = setup(35_000);

    await user.clear(input);
    await user.tab();

    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue('350,00\u00a0zł');
  });
});
