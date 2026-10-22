import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LibraryImportProposalSchema } from '@/domain/ai';
import { formatMoney } from '@/domain/money';
import type { LibraryCategory } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { ProposalTable } from './ProposalTable';
import { rowsFromProposal } from './proposal-rows';

const CATEGORIES: LibraryCategory[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Projekt',
    code: '01',
    color: null,
    sortOrder: 0,
    isSample: false,
  },
];

const PROPOSAL = LibraryImportProposalSchema.parse({
  items: [
    {
      name: 'Projekt koncepcyjny',
      categoryName: 'Projekt',
      pricingChoice: 'flat_m2',
      unitPriceCents: 15000,
      confidence: 'high',
    },
    {
      name: 'Nadzór autorski',
      categoryName: 'Nadzór',
      pricingChoice: 'individual',
      confidence: 'low',
      sourceNote: 'wiersz 7',
    },
    {
      name: 'Wizja lokalna',
      pricingChoice: 'flat_visit',
      unitPriceCents: 30000,
      minPriceCents: 25000,
      confidence: 'medium',
    },
  ],
  newCategories: ['Nadzór'],
  warnings: ['Pominięto wiersz 12: brak nazwy'],
});

function renderTable(overrides: Partial<Parameters<typeof ProposalTable>[0]> = {}) {
  const props = {
    rows: rowsFromProposal(PROPOSAL, ['wizja LOKALNA']),
    categories: CATEGORIES,
    warnings: PROPOSAL.warnings,
    onToggle: vi.fn(),
    onToggleAll: vi.fn(),
    onChange: vi.fn(),
    ...overrides,
  };
  render(<ProposalTable {...props} />);
  return props;
}

describe('ProposalTable', () => {
  it('oznacza „już masz" i odznacza taki wiersz, resztę zostawia zaznaczoną', () => {
    renderTable();

    expect(screen.getByText(pl.ai.import.alreadyHave)).toBeInTheDocument();

    const boxes = screen.getAllByRole('checkbox');
    // [0] = „zaznacz wszystkie", dalej wiersze w kolejności propozycji.
    expect(boxes[1]).toHaveAttribute('aria-checked', 'true');
    expect(boxes[2]).toHaveAttribute('aria-checked', 'true');
    expect(boxes[3]).toHaveAttribute('aria-checked', 'false');
    expect(boxes[0]).toHaveAttribute('aria-checked', 'mixed');

    expect(screen.getByText(pl.ai.import.selectedCount(2, 3))).toBeInTheDocument();
  });

  it('podświetla wiersz o niskiej pewności i pokazuje etykiety pewności', () => {
    renderTable();

    const low = screen.getByText(pl.ai.import.confidence.low).closest('tr');
    expect(low).toHaveClass('bg-surface-2');
    expect(low).toHaveAttribute('data-confidence', 'low');
    expect(screen.getByText(pl.ai.import.confidence.low)).toHaveAttribute('title', 'wiersz 7');

    const high = screen.getByText(pl.ai.import.confidence.high).closest('tr');
    expect(high).not.toHaveClass('bg-surface-2');
  });

  it('pokazuje cenę sformatowaną, „indywidualnie" jako wyłączone pole i „od" pod kwotą', () => {
    renderTable();

    const prices = screen.getAllByLabelText(pl.ai.import.columns.price);
    expect(prices[0]).toHaveValue(formatMoney(15000));
    expect(prices[1]).toBeDisabled();
    expect(prices[1]).toHaveAttribute('placeholder', pl.ai.import.priceIndividual);
    // Domyślny normalizer Testing Library zamienia twardą spację z `Intl` na zwykłą.
    expect(
      screen.getByText(pl.ai.import.fromPrice(formatMoney(25000)).replace(/\s+/g, ' ')),
    ).toBeInTheDocument();
  });

  it('edycja nazwy i ceny wraca do rodzica przez onChange z indeksem wiersza', async () => {
    const user = userEvent.setup();
    const props = renderTable();

    const names = screen.getAllByLabelText(pl.ai.import.columns.name);
    await user.type(names[2]!, 'X');
    expect(props.onChange).toHaveBeenLastCalledWith(2, { name: 'Wizja lokalnaX' });

    const price = screen.getAllByLabelText(pl.ai.import.columns.price)[0]!;
    fireEvent.focus(price);
    fireEvent.change(price, { target: { value: '1 200,50 zł' } });
    fireEvent.blur(price);
    expect(props.onChange).toHaveBeenLastCalledWith(0, { unitPriceCents: 120050 });
  });

  it('nieczytelna cena nie trafia do rodzica', () => {
    const props = renderTable();
    const price = screen.getAllByLabelText(pl.ai.import.columns.price)[0]!;
    fireEvent.focus(price);
    fireEvent.change(price, { target: { value: 'abc' } });
    fireEvent.blur(price);
    expect(props.onChange).not.toHaveBeenCalled();
    expect(price).toHaveValue(formatMoney(15000));
  });

  it('checkboxy wołają onToggle / onToggleAll', async () => {
    const user = userEvent.setup();
    const props = renderTable();
    const boxes = screen.getAllByRole('checkbox');

    await user.click(boxes[3]!);
    expect(props.onToggle).toHaveBeenCalledWith(2, true);

    await user.click(boxes[0]!);
    expect(props.onToggleAll).toHaveBeenCalledWith(true);
  });

  it('wypisuje ostrzeżenia modelu pod tabelą', () => {
    renderTable();
    expect(screen.getByText(pl.ai.import.warnings)).toBeInTheDocument();
    expect(screen.getByText('Pominięto wiersz 12: brak nazwy')).toBeInTheDocument();
  });
});
