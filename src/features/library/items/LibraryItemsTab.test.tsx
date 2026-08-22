import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem, LibraryItemPatch } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryCategories = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());
const linkedCount = vi.hoisted(() => vi.fn());
const applyCascade = vi.hoisted(() => vi.fn());

/**
 * Zapis pozycji: mock odgrywa udany round-trip, czyli woła `onSuccess`
 * z pozycją po zmianach — tylko wtedy da się sprawdzić kaskadę.
 */
const updateMutate = vi.hoisted(() =>
  vi.fn(
    (
      vars: { id: string; patch: LibraryItemPatch },
      options?: { onSuccess?: (saved: LibraryItem) => void },
    ) => {
      const saved: LibraryItem = { ...baseItem(), ...vars.patch, id: vars.id };
      options?.onSuccess?.(saved);
    },
  ),
);

function baseItem(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'item-1',
    workspaceId: 'ws',
    category: 'Wykończenie',
    kind: 'item',
    name: 'Blat kuchenny',
    description: 'Dąb lity, 40 mm',
    unitPriceCents: 250_000,
    sortOrder: 10,
    ...partial,
  };
}

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useLibraryCategories,
  useCreateLibraryItem: () => ({ mutate: createMutate, isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteLibraryItem: () => ({ mutate: deleteMutate, isPending: false }),
}));

vi.mock('@/features/quotes/editor/useLibraryCascade', () => ({
  useLibraryCascade: () => ({ linkedCount, apply: applyCascade }),
}));

const { LibraryItemsTab } = await import('./LibraryItemsTab');

function mockItems(rows: LibraryItem[], overrides: Record<string, unknown> = {}) {
  useLibraryItems.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

/** Ostatnie filtry, z jakimi zakładka zawołała hooka danych. */
function lastFilters(): Record<string, unknown> {
  const calls = useLibraryItems.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

/** Etykieta przycisku karty (klucze i18n sa funkcjami nazwy pozycji). */
function label(key: (name: string) => string, name = 'Blat kuchenny') {
  return key(name);
}

/** Etykieta pola karty: „Nazwa pozycji: Blat kuchenny”. */
function fieldLabel(base: string, name = 'Blat kuchenny') {
  return `${base}: ${name}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  linkedCount.mockReturnValue(0);
  useLibraryCategories.mockReturnValue({ data: ['Wykończenie', 'Instalacje'], isLoading: false });
  mockItems([baseItem()]);
});

describe('LibraryItemsTab — filtry', () => {
  it('przekazuje fraze wyszukiwania do zapytania, a nie filtruje w przegladarce', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.type(screen.getByLabelText(pl.library.searchPlaceholder), 'blat');
    expect(lastFilters().search).toBe('blat');
  });

  it('nie wysyla pustej frazy jako filtra', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.type(screen.getByLabelText(pl.library.searchPlaceholder), '   ');
    expect(lastFilters().search).toBeUndefined();
  });

  it('przekazuje kategorie z pigulek do zapytania', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    expect(lastFilters().category).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Instalacje' }));
    expect(lastFilters().category).toBe('Instalacje');
  });

  it('rozroznia pusta biblioteke od pustego wyniku filtrowania', async () => {
    const user = userEvent.setup();
    mockItems([]);
    render(<LibraryItemsTab />);

    expect(screen.getByText(pl.library.itemsEmptyTitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Wykończenie' }));
    expect(screen.getByText(pl.library.itemsNoResultsTitle)).toBeInTheDocument();
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    const refetch = vi.fn();
    mockItems([], { isError: true, refetch });
    render(<LibraryItemsTab />);

    expect(screen.getByText(new RegExp(pl.library.loadError))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});

describe('LibraryItemsTab — edycja pozycji', () => {
  it('zapisuje cene przepuszczona przez parseMoney (grosze, nie zlotowki)', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    const price = screen.getByLabelText(fieldLabel(pl.library.itemPriceLabel));
    await user.clear(price);
    await user.type(price, '1 200,50');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const [vars] = updateMutate.mock.calls[0] ?? [];
    expect(vars?.patch.unitPriceCents).toBe(120_050);
  });

  it('rozpoznaje rabat: pokazuje znak minus przy kwocie', () => {
    mockItems([baseItem({ kind: 'discount', name: 'Rabat stałego klienta' })]);
    render(<LibraryItemsTab />);

    expect(
      screen.getByRole('button', { name: pl.library.kindDiscount, pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('usuwa dopiero po potwierdzeniu w dialogu', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.click(screen.getByRole('button', { name: label(pl.library.deleteItem) }));
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.common.delete }));
    expect(deleteMutate).toHaveBeenCalledWith('item-1');
  });
});

describe('LibraryItemsTab — kaskada do otwartej wyceny', () => {
  async function editNameAndSave(user: ReturnType<typeof userEvent.setup>) {
    const name = screen.getByLabelText(fieldLabel(pl.library.itemNameLabel));
    await user.clear(name);
    await user.type(name, 'Blat dębowy');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));
  }

  it('nie pyta o nic, gdy zadna pozycja wyceny nie pochodzi z tego wpisu', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(0);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
    expect(applyCascade).not.toHaveBeenCalled();
  });

  it('pyta i podaje LICZBE pozycji, gdy wycena ma powiazane pozycje', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(2);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);

    expect(screen.getByText(pl.library.cascadeTitle)).toBeInTheDocument();
    expect(screen.getByText(/2 pozycje/)).toBeInTheDocument();
  });

  it('po potwierdzeniu kaskaduje tylko zmienione pola', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(2);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);
    await user.click(screen.getByRole('button', { name: pl.library.cascadeConfirm }));

    expect(applyCascade).toHaveBeenCalledWith('item-1', { name: 'Blat dębowy' });
  });

  it('odmowa zostawia zmiane w bibliotece i NIE rusza wyceny', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(3);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);
    await user.click(screen.getByRole('button', { name: pl.library.cascadeDismiss }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(applyCascade).not.toHaveBeenCalled();
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
  });

  it('nie pyta, gdy zmienilo sie wylacznie pole spoza kaskady (kategoria)', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(5);
    render(<LibraryItemsTab />);

    const category = screen.getByLabelText(fieldLabel(pl.library.itemCategoryLabel));
    await user.clear(category);
    await user.type(category, 'Meble');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
    expect(applyCascade).not.toHaveBeenCalled();
  });
});
