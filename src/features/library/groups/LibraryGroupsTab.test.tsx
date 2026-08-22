import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryGroup, LibraryItemSnapshot } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

const useLibraryGroups = vi.hoisted(() => vi.fn());
// Karta zestawu pozwala dołożyć pozycję z biblioteki, więc zakładka sięga
// też po listę pozycji.
const useLibraryItems = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryGroups,
  useLibraryItems,
  useCreateLibraryGroup: () => ({ mutate: createMutate, isPending: false }),
  useUpdateLibraryGroup: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteLibraryGroup: () => ({ mutate: deleteMutate, isPending: false }),
}));

const { LibraryGroupsTab } = await import('./LibraryGroupsTab');

function group(partial: Partial<LibraryGroup> = {}): LibraryGroup {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Kuchnia pod klucz',
    items: [
      {
        name: 'Zabudowa',
        description: '',
        kind: 'item',
        qty: 1,
        unitPriceCents: 300_000,
        libraryItemId: null,
      },
      {
        name: 'Montaż',
        description: '',
        kind: 'item',
        qty: 1,
        unitPriceCents: 100_000,
        libraryItemId: null,
      },
      {
        name: 'Rabat',
        description: '',
        kind: 'discount',
        qty: 1,
        unitPriceCents: 50_000,
        libraryItemId: null,
      },
    ],
    sortOrder: 0,
    ...partial,
  };
}

function mockGroups(rows: LibraryGroup[], overrides: Record<string, unknown> = {}) {
  useLibraryGroups.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGroups([group()]);
  useLibraryItems.mockReturnValue({ data: [] });
});

describe('LibraryGroupsTab', () => {
  it('pokazuje liczbe pozycji i sume netto liczona w domenie (rabat odjety)', () => {
    render(<LibraryGroupsTab />);

    expect(screen.getByText(pl.library.itemsCount(3))).toBeInTheDocument();
    // 3000 + 1000 − 500 zl = 3500 zl netto.
    expect(screen.getByText(/3\s?500,00/)).toBeInTheDocument();
  });

  it('rozwija podglad pozycji grupy', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    expect(screen.queryByText('Zabudowa')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: pl.library.showGroupItems('Kuchnia pod klucz') }),
    );

    expect(screen.getByText('Zabudowa')).toBeInTheDocument();
    // Rabat w podgladzie ma znak minus.
    expect(screen.getByText(/-\s?500,00/)).toBeInTheDocument();
  });

  it('zapisuje zmieniona nazwe grupy', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    const name = screen.getByLabelText(`${pl.library.groupNameLabel}: Kuchnia pod klucz`);
    await user.clear(name);
    await user.type(name, 'Kuchnia premium');
    await user.click(
      screen.getByRole('button', { name: pl.library.saveGroup('Kuchnia pod klucz') }),
    );

    expect(updateMutate).toHaveBeenCalledWith({
      id: '11111111-1111-4111-8111-111111111111',
      patch: { name: 'Kuchnia premium' },
    });
  });

  it('usuwa grupe dopiero po potwierdzeniu', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    await user.click(
      screen.getByRole('button', { name: pl.library.deleteGroup('Kuchnia pod klucz') }),
    );
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.common.delete }));
    expect(deleteMutate).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('pusta zakladka zaprasza do dodania pierwszej grupy', async () => {
    const user = userEvent.setup();
    mockGroups([]);
    render(<LibraryGroupsTab />);

    expect(screen.getByText(pl.library.groupsEmptyTitle)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: pl.library.addGroup })[1]!);
    expect(createMutate).toHaveBeenCalledWith({ name: pl.library.newGroupName });
  });
});

/**
 * Zawartosc zestawu. Bez tego zestaw dawalo sie tylko stworzyc pusty
 * i przemianowac — a wstawienie takiego zestawu do wyceny nie dawalo nic.
 */
describe('LibraryGroupsTab — zawartosc zestawu', () => {
  const expand = async (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: pl.library.showGroupItems('Kuchnia pod klucz') }));

  /** Pozycje z pierwszego zapisu zestawu — mock jest nietypowany, wiec bierzemy go raz. */
  function savedItems(): LibraryItemSnapshot[] {
    const call = updateMutate.mock.calls[0]?.[0] as
      | { patch?: { items?: LibraryItemSnapshot[] } }
      | undefined;
    return call?.patch?.items ?? [];
  }

  it('rozwija tylko wskazany zestaw, nie wszystkie', async () => {
    const user = userEvent.setup();
    mockGroups([
      group(),
      group({
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Łazienka',
        items: [
          {
            name: 'Płytki',
            description: '',
            kind: 'item',
            qty: 1,
            unitPriceCents: 100_000,
            libraryItemId: null,
          },
        ],
      }),
    ]);
    render(<LibraryGroupsTab />);

    await user.click(
      screen.getByRole('button', { name: pl.library.showGroupItems('Kuchnia pod klucz') }),
    );

    expect(screen.getByText('Zabudowa')).toBeInTheDocument();
    expect(screen.queryByText('Płytki')).not.toBeInTheDocument();
    // Jeden picker, nie dwa — rozwinieta jest dokladnie jedna karta.
    expect(screen.getAllByRole('button', { name: /Dodaj pozycję do zestawu/ })).toHaveLength(1);
  });

  it('dodaje pozycje z biblioteki do zestawu jako snapshot', async () => {
    const user = userEvent.setup();
    useLibraryItems.mockReturnValue({
      data: [
        {
          id: '99999999-9999-4999-8999-999999999999',
          workspaceId: '22222222-2222-4222-8222-222222222222',
          category: 'Kuchnia',
          kind: 'item',
          name: 'Blat kamienny',
          description: 'Konglomerat',
          unitPriceCents: 220_000,
          sortOrder: 0,
        },
      ],
    });
    render(<LibraryGroupsTab />);

    await expand(user);
    await user.click(
      screen.getByRole('button', { name: pl.library.groupAddItemFor('Kuchnia pod klucz') }),
    );
    await user.click(await screen.findByText('Blat kamienny'));

    const items = savedItems();
    expect(items).toHaveLength(4);
    // Snapshot, nie klucz obcy — ale z `libraryItemId`, zeby kaskada dalej dzialala.
    expect(items[3]).toEqual({
      name: 'Blat kamienny',
      description: 'Konglomerat',
      kind: 'item',
      qty: 1,
      unitPriceCents: 220_000,
      libraryItemId: '99999999-9999-4999-8999-999999999999',
    });
  });

  it('usuwa pozycje z zestawu', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    await expand(user);
    await user.click(screen.getByRole('button', { name: pl.library.groupRemoveItem('Montaż') }));

    expect(savedItems().map((item) => item.name)).toEqual(['Zabudowa', 'Rabat']);
  });

  it('zapisuje ilosc dopiero po wyjsciu z pola, nie po kazdym klawiszu', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    await expand(user);
    const qty = screen.getByLabelText(pl.library.groupItemQty('Zabudowa'));
    await user.clear(qty);
    await user.type(qty, '14');

    // Kazdy klawisz osobnym zapisem to 14 round-tripow na jedna liczbe.
    expect(updateMutate).not.toHaveBeenCalled();

    await user.tab();
    expect(savedItems()[0]?.qty).toBe(14);
  });

  it('nie zapisuje ilosci, ktorej domena by nie przyjela', async () => {
    const user = userEvent.setup();
    render(<LibraryGroupsTab />);

    await expand(user);
    const qty = screen.getByLabelText(pl.library.groupItemQty('Zabudowa'));
    await user.clear(qty);
    await user.type(qty, '0');
    await user.tab();

    // `qty` jest w domenie `positive()` — zero wrocilo by z bledem walidacji.
    expect(updateMutate).not.toHaveBeenCalled();
    expect(qty).toHaveValue('1');
  });
});
