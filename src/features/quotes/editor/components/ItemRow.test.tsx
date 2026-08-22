import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ItemRow } from './ItemRow';
import { newItem, type Item } from '@/domain/quote';
import { pl } from '@/i18n/pl';

function setup(overrides: Partial<Item> = {}, editing = true) {
  const item = newItem({ name: 'Blat kuchenny', unitPriceCents: 120_000, ...overrides });
  const handlers = { onToggle: vi.fn(), onPatch: vi.fn(), onRemove: vi.fn() };

  render(<ItemRow item={item} editing={editing} currency="PLN" {...handlers} />);
  return { item, ...handlers };
}

describe('ItemRow', () => {
  it('przelacza pozycje', async () => {
    const user = userEvent.setup();
    const { item, onToggle } = setup();

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(item.id);
  });

  it('przelacznik dziala takze w podgladzie — to jest sedno produktu', async () => {
    const user = userEvent.setup();
    const { item, onToggle } = setup({}, false);

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(item.id);
  });

  it('w podgladzie nie ma pol edycji ani usuwania', () => {
    setup({}, false);

    expect(screen.queryByLabelText(pl.editor.itemPriceLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(pl.editor.itemQtyLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuń pozycję/ })).not.toBeInTheDocument();
    // Nazwa zostaje, ale jako TEKST, nie pole formularza. `readonly` input
    // nie potrafi zawijać, więc dłuższe wartości byłyby ucinane; poza tym
    // czytnik ekranu ogłaszałby podgląd jako formularz.
    expect(screen.getByLabelText(pl.editor.itemNameLabel)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('wylaczona pozycja zmienia kolor, a NIE znika i nie jest przekreslona', () => {
    setup({ enabled: false }, false);
    const name = screen.getByLabelText(pl.editor.itemNameLabel);

    // Klient ma dalej czytac, z czego rezygnuje — zadnego opacity ani line-through.
    expect(name).toBeVisible();
    expect(name.className).not.toMatch(/line-through|opacity/);
    expect(name.className).toContain('text-[var(--doc-ink-soft)]');
  });

  it('rabat dostaje znak minus i kolor terakoty', () => {
    setup({ kind: 'discount', enabled: true }, false);

    expect(screen.getByText('−')).toBeInTheDocument();
    const amount = screen.getByText(/1\s?200,00/);
    expect(amount.closest('div')?.className).toContain('--doc-terracotta');
  });

  it('w podgladzie pokazuje ilosc tylko wtedy, gdy rozna od jedynki', () => {
    const { unmount } = render(
      <ItemRow
        item={newItem({ name: 'A', qty: 1, unitPriceCents: 1000 })}
        editing={false}
        currency="PLN"
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    unmount();

    render(
      <ItemRow
        item={newItem({ name: 'B', qty: 2.5, unitPriceCents: 1000 })}
        editing={false}
        currency="PLN"
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByText('2.5 ×')).toBeInTheDocument();
  });

  it('w podgladzie pokazuje wartosc pozycji, czyli ilosc razy cena', () => {
    setup({ qty: 3, unitPriceCents: 10_000 }, false);
    expect(screen.getByText(/300,00/)).toBeInTheDocument();
  });

  it('usuwa pozycje', async () => {
    const user = userEvent.setup();
    const { item, onRemove } = setup();

    await user.click(screen.getByRole('button', { name: /Usuń pozycję/ }));
    expect(onRemove).toHaveBeenCalledWith(item.id);
  });
});
