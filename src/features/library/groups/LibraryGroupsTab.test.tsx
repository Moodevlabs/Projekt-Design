import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryGroup } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

const useLibraryGroups = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryGroups,
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
        unitPriceCents: 300_000,
        libraryItemId: null,
      },
      {
        name: 'Montaż',
        description: '',
        kind: 'item',
        unitPriceCents: 100_000,
        libraryItemId: null,
      },
      {
        name: 'Rabat',
        description: '',
        kind: 'discount',
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
