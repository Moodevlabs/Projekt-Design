import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiscountsSection } from './DiscountsSection';
import { newItem, newQuoteBody, newSection, type Discount, type QuoteBody } from '@/domain/quote';
import { newId } from '@/domain/id';
import { pl } from '@/i18n/pl';

function discount(partial: Partial<Discount> & { name: string }): Discount {
  return {
    id: newId(),
    description: '',
    enabled: true,
    type: 'fixed',
    valueCents: 0,
    scope: 'quote',
    sectionId: null,
    itemIds: [],
    condition: 'always',
    roundToCents: 0,
    ...partial,
  };
}

function setup(discounts: Discount[], editing = true) {
  const sekcja = newSection({
    title: 'Etap funkcjonalny',
    items: Array.from({ length: 5 }, (_, index) =>
      newItem({ name: `Pozycja ${index + 1}`, unitPriceCents: 10_000 }),
    ),
  });
  const body: QuoteBody = newQuoteBody({ vatRate: 0, sections: [sekcja], discounts });

  const handlers = {
    onAdd: vi.fn(),
    onToggle: vi.fn(),
    onPatch: vi.fn(),
    onRemove: vi.fn(),
  };

  render(<DiscountsSection body={body} currency="PLN" editing={editing} {...handlers} />);
  return { body, sekcja, ...handlers };
}

describe('DiscountsSection', () => {
  it('pokazuje kwote rabatu procentowego policzona przez domene', () => {
    setup([discount({ name: 'Wizualizacje uproszczone', type: 'percent', percent: 25 })]);

    // 25% z 500 zl = 125 zl — raz w wierszu rabatu, raz w sumie naglowka.
    // Obie liczby musza byc te same, inaczej naglowek klamie.
    expect(screen.getAllByText(/125,00/)).toHaveLength(2);
  });

  it('rabat warunkowy tlumaczy, DLACZEGO wyszlo zero', () => {
    const { sekcja } = setup([]);
    // Osobny render z rabatem warunkowym na niekompletnym etapie.
    const items = sekcja.items.map((item, index) =>
      index === 0 ? { ...item, enabled: false } : item,
    );
    const body = newQuoteBody({
      vatRate: 0,
      sections: [{ ...sekcja, items }],
      discounts: [
        discount({
          name: 'Rabat za kompletny etap',
          type: 'percent',
          percent: 5,
          scope: 'section',
          sectionId: sekcja.id,
          condition: 'all_items_in_scope_enabled',
        }),
      ],
    });

    render(
      <DiscountsSection
        body={body}
        currency="PLN"
        editing
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    // Bez tego komunikatu zero wyglada jak blad, a nie jak zacheta.
    expect(screen.getByText(pl.editor.discountUnmet(4, 5))).toBeInTheDocument();
  });

  it('zmiana typu na procent idzie do store', async () => {
    const user = userEvent.setup();
    const { onPatch } = setup([discount({ name: 'Rabat', valueCents: 5_000 })]);

    await user.selectOptions(
      screen.getByLabelText(pl.editor.discountTypeLabel('Rabat')),
      'percent',
    );

    expect(onPatch).toHaveBeenCalledWith(expect.any(String), { type: 'percent' });
  });

  it('zmiana zakresu czysci wskazania poprzedniego', async () => {
    const user = userEvent.setup();
    const { onPatch } = setup([discount({ name: 'Rabat', scope: 'items', itemIds: ['a', 'b'] })]);

    await user.selectOptions(screen.getByLabelText(pl.editor.discountScopeLabel('Rabat')), 'quote');

    // Inaczej rabat „na calosc” pamietalby pozycje z trybu „wybrane”.
    expect(onPatch).toHaveBeenCalledWith(expect.any(String), {
      scope: 'quote',
      sectionId: null,
      itemIds: [],
    });
  });

  it('poza edycja nie pokazuje kontrolek ani pustej sekcji', () => {
    const { container } = render(
      <DiscountsSection
        body={newQuoteBody({ discounts: [] })}
        currency="PLN"
        editing={false}
        onAdd={vi.fn()}
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('w edycji pusta sekcja zaprasza do dodania rabatu', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup([]);

    expect(screen.getByText(pl.editor.discountsEmpty)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: pl.editor.addDiscountEntry }));
    expect(onAdd).toHaveBeenCalled();
  });
});
