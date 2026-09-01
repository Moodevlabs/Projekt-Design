import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocLibraryRow } from '@/data/repos/library-docs.repo';
import type { DocLibraryCategory } from '@/domain/library/doc-groups';
import { pl } from '@/i18n/pl';

const useDocCategories = vi.hoisted(() => vi.fn());
const useDocLibrary = vi.hoisted(() => vi.fn());
const assignMutate = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());
const reorderMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibraryDocGroups', () => ({
  useDocCategories,
  useCreateDocCategory: () => ({ mutate: createMutate, isPending: false }),
  useUpdateDocCategory: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteDocCategory: () => ({ mutate: deleteMutate, isPending: false }),
  useReorderDocCategories: () => ({ mutate: reorderMutate, isPending: false }),
  useSetDocEntryCategory: () => ({ mutate: assignMutate, isPending: false }),
}));

vi.mock('@/data/queries/useLibraryDocs', () => ({ useDocLibrary }));

const { DocCategoriesPanel } = await import('./DocCategoriesPanel');

const KONCEPCJA = '11111111-1111-4111-8111-111111111111';
const PROJEKT = '33333333-3333-4333-8333-333333333333';

function category(partial: Partial<DocLibraryCategory> = {}): DocLibraryCategory {
  return {
    id: KONCEPCJA,
    workspaceId: 'ws',
    kind: 'schedule',
    name: 'Koncepcja',
    code: '01',
    color: null,
    sortOrder: 0,
    isSample: false,
    ...partial,
  };
}

function row(
  id: string,
  name: string,
  categoryId: string | null = KONCEPCJA,
): DocLibraryRow<'schedule'> {
  return {
    id,
    name,
    isSample: false,
    categoryId,
    entry: {
      id,
      workspaceId: 'ws',
      kind: 'schedule',
      name,
      payload: { name, owner: 'provider' } as never,
      sortOrder: 0,
      isSample: false,
      categoryId,
    },
  };
}

function setup(categories: DocLibraryCategory[], rows: DocLibraryRow<'schedule'>[]) {
  useDocCategories.mockReturnValue({
    data: categories,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  useDocLibrary.mockReturnValue({ data: rows, isLoading: false, isError: false, refetch: vi.fn() });
  return render(<DocCategoriesPanel kind="schedule" />);
}

beforeEach(() => vi.clearAllMocks());

/**
 * T-121 przenosi na dokumenty naukę z T-120: grupa ma być pojemnikiem,
 * a nie etykietą z licznikiem.
 */
describe('DocCategoriesPanel', () => {
  it('rozwija wskazaną grupę i pokazuje jej wpisy', async () => {
    const user = userEvent.setup();
    setup(
      [category(), category({ id: PROJEKT, name: 'Projekt', code: '02', sortOrder: 1 })],
      [row('e1', 'Pomiar'), row('e2', 'Rzuty', PROJEKT)],
    );

    expect(screen.queryByText('Pomiar')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.showEntries('Koncepcja') }),
    );

    expect(screen.getByText('Pomiar')).toBeInTheDocument();
    expect(screen.queryByText('Rzuty')).not.toBeInTheDocument();
  });

  it('dopięcie wpisu przestawia category_id, nie kopiuje wpisu', async () => {
    const user = userEvent.setup();
    setup([category()], [row('e9', 'Rzuty', null)]);

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.showEntries('Koncepcja') }),
    );
    expect(screen.getByText(pl.library.docs.groups.entriesEmpty)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.addEntryFor('Koncepcja') }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: pl.library.docs.groups.pickerAddLabel('Rzuty'),
      }),
    );

    expect(assignMutate).toHaveBeenCalledWith(
      { entryId: 'e9', categoryId: KONCEPCJA },
      expect.anything(),
    );
  });

  it('odpięcie ustawia null, a nie usuwa wpisu', async () => {
    const user = userEvent.setup();
    setup([category()], [row('e1', 'Pomiar')]);

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.showEntries('Koncepcja') }),
    );
    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.removeEntry('Pomiar') }),
    );

    expect(assignMutate).toHaveBeenCalledWith(
      { entryId: 'e1', categoryId: null },
      expect.anything(),
    );
  });

  it('picker proponuje wpisy z innych grup i mówi, skąd je zabierze', async () => {
    const user = userEvent.setup();
    setup(
      [category(), category({ id: PROJEKT, name: 'Projekt', code: '02', sortOrder: 1 })],
      [row('e1', 'Pomiar'), row('e2', 'Rzuty', PROJEKT)],
    );

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.showEntries('Koncepcja') }),
    );
    await user.click(
      screen.getByRole('button', { name: pl.library.docs.groups.addEntryFor('Koncepcja') }),
    );

    expect(await screen.findByText('Rzuty')).toBeInTheDocument();
    expect(screen.getByText(pl.library.docs.groups.pickerFrom('Projekt'))).toBeInTheDocument();
  });

  it('liczy wpisy bez grupy, żeby nie zniknęły z pola widzenia', () => {
    setup([category()], [row('e1', 'Pomiar'), row('e2', 'Rzuty', null)]);

    expect(screen.getByText(pl.library.docs.groups.withoutGroup(1))).toBeInTheDocument();
  });
});
