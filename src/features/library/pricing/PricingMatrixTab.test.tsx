import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useUpdateLibraryItem: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes: () => ({
    data: [
      { id: 'rt-kuchnia', workspaceId: 'ws', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 10 },
      { id: 'rt-salon', workspaceId: 'ws', name: 'Salon', slug: 'salon', sortOrder: 20 },
    ],
    isLoading: false,
    isError: false,
  }),
}));

const { PricingMatrixTab } = await import('./PricingMatrixTab');

function item(partial: Partial<LibraryItem> & { id: string; name: string }): LibraryItem {
  return {
    workspaceId: 'ws',
    category: 'Inne',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    description: '',
    unitPriceCents: 0,
    sortOrder: 0,
    variantOf: null,
    pricingBasis: 'amount',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

const PARAMETRYCZNA = item({
  id: '1',
  name: 'Projekt budowlany',
  pricing: {
    mode: 'per_room',
    baseCents: 20_000,
    perRoomCents: { 'rt-kuchnia': 5_000 },
    defaultPerRoomCents: 1_500,
    roomScope: 'technical',
  },
});

const STALA = item({ id: '2', name: 'Nadzor', unitPriceCents: 25_000 });

function mockItems(rows: LibraryItem[]) {
  useLibraryItems.mockReturnValue({ data: rows, isLoading: false, isError: false, refetch: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockItems([PARAMETRYCZNA, STALA]);
});

describe('PricingMatrixTab', () => {
  it('domyslnie pokazuje tylko pozycje liczone za pomieszczenie', () => {
    render(<PricingMatrixTab />);

    expect(screen.getByText('Projekt budowlany')).toBeInTheDocument();
    expect(screen.queryByText('Nadzor')).not.toBeInTheDocument();
  });

  it('po odznaczeniu filtra pokazuje cala biblioteke', async () => {
    const user = userEvent.setup();
    render(<PricingMatrixTab />);

    await user.click(screen.getByLabelText(pl.library.matrixOnlyParametric));
    expect(screen.getByText('Nadzor')).toBeInTheDocument();
  });

  it('pusta komorka pokazuje stawke domyslna, a nie zero', () => {
    render(<PricingMatrixTab />);

    // Salon nie ma wlasnej stawki, wiec liczy sie 15 zl z „pozostalych”.
    const salon = screen.getByLabelText(pl.library.matrixCell('Projekt budowlany', 'Salon'));
    // Porownujemy przez `formatMoney`, a nie recznie wpisany tekst —
    // formatowanie uzywa niełamliwej spacji, ktorej nie widac w zrodle testu.
    expect(salon).toHaveValue(formatMoney(1_500));
  });

  it('zmiana stawki zapisuje regule z zachowaniem pozostalych pol', async () => {
    const user = userEvent.setup();
    render(<PricingMatrixTab />);

    const kuchnia = screen.getByLabelText(pl.library.matrixCell('Projekt budowlany', 'Kuchnia'));
    await user.clear(kuchnia);
    await user.type(kuchnia, '99');

    const patch = updateMutate.mock.calls.at(-1)?.[0] as { patch: { pricing?: unknown } };
    expect(patch.patch.pricing).toMatchObject({
      mode: 'per_room',
      perRoomCents: { 'rt-kuchnia': 9_900 },
      baseCents: 20_000,
      // Zasieg i „pozostale” to nie sprawa tej komorki.
      roomScope: 'technical',
      defaultPerRoomCents: 1_500,
    });
  });

  it('samo otwarcie macierzy nie zamienia pozycji stalocenowych na parametryczne', async () => {
    const user = userEvent.setup();
    render(<PricingMatrixTab />);

    await user.click(screen.getByLabelText(pl.library.matrixOnlyParametric));

    // Widok pokazuje „Nadzor”, ale dopoki nikt nie wpisze stawki, nic sie nie
    // zapisuje — inaczej wejscie na zakladke przestawiloby cala biblioteke.
    expect(updateMutate).not.toHaveBeenCalled();
  });
});
