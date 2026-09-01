import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocLibraryEntry } from '@/domain/library/doc-entries';
import type { DocLibrarySet } from '@/domain/library/doc-groups';
import { pl } from '@/i18n/pl';

const useDocSets = vi.hoisted(() => vi.fn());
const useDocLibraryEntries = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibraryDocGroups', () => ({
  useDocSets,
  useCreateDocSet: () => ({ mutate: createMutate, isPending: false }),
  useUpdateDocSet: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteDocSet: () => ({ mutate: deleteMutate, isPending: false }),
}));

vi.mock('@/data/queries/useLibraryDocs', () => ({ useDocLibraryEntries }));

const { DocSetsPanel } = await import('./DocSetsPanel');

function payload(name: string) {
  return { name, description: '', included: true, sectionLabel: '', linkedItemTags: [] } as never;
}

function entry(id: string, name: string): DocLibraryEntry<'stages'> {
  return {
    id,
    workspaceId: 'ws',
    kind: 'stages',
    name,
    payload: payload(name),
    sortOrder: 0,
    isSample: false,
    categoryId: null,
  };
}

function set(partial: Partial<DocLibrarySet<'stages'>> = {}): DocLibrarySet<'stages'> {
  return {
    id: 's1',
    workspaceId: 'ws',
    kind: 'stages',
    name: 'Pełny proces',
    items: [payload('Koncepcja'), payload('Projekt')],
    sortOrder: 0,
    isSample: false,
    ...partial,
  };
}

function setup(sets: DocLibrarySet<'stages'>[], entries: DocLibraryEntry<'stages'>[] = []) {
  useDocSets.mockReturnValue({ data: sets, isLoading: false, isError: false, refetch: vi.fn() });
  useDocLibraryEntries.mockReturnValue({ entries, isLoading: false, isError: false });
  return render(<DocSetsPanel kind="stages" />);
}

beforeEach(() => vi.clearAllMocks());

describe('DocSetsPanel', () => {
  it('pokazuje liczbę wpisów i rozwija zawartość dopiero na żądanie', async () => {
    const user = userEvent.setup();
    setup([set()]);

    expect(screen.queryByText('Koncepcja')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.showItems('Pełny proces') }),
    );

    expect(screen.getByText('Koncepcja')).toBeInTheDocument();
    expect(screen.getByText('Projekt')).toBeInTheDocument();
  });

  /** Zestaw to SNAPSHOT — dodanie wkłada kopię payloadu, nie klucz obcy. */
  it('dodanie wpisu wkłada do zestawu kopię payloadu', async () => {
    const user = userEvent.setup();
    setup([set({ items: [] })], [entry('e1', 'Nadzór autorski')]);

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.showItems('Pełny proces') }),
    );
    expect(screen.getByText(pl.library.docs.sets.itemsEmpty)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.addItemFor('Pełny proces') }),
    );
    await user.click(
      await screen.findByRole('button', {
        name: pl.library.docs.sets.pickerAddLabel('Nadzór autorski'),
      }),
    );

    expect(updateMutate).toHaveBeenCalledWith({
      id: 's1',
      patch: { items: [expect.objectContaining({ name: 'Nadzór autorski' })] },
    });
  });

  it('usunięcie wpisu z zestawu zapisuje krótszą listę', async () => {
    const user = userEvent.setup();
    setup([set()]);

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.showItems('Pełny proces') }),
    );
    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.removeItem('Koncepcja') }),
    );

    expect(updateMutate).toHaveBeenCalledWith({
      id: 's1',
      patch: { items: [expect.objectContaining({ name: 'Projekt' })] },
    });
  });

  it('usunięcie zestawu wymaga potwierdzenia', async () => {
    const user = userEvent.setup();
    setup([set()]);

    await user.click(
      screen.getByRole('button', { name: pl.library.docs.sets.delete('Pełny proces') }),
    );
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.common.delete }));
    expect(deleteMutate).toHaveBeenCalledWith('s1');
  });

  it('pusta zakładka zaprasza do dodania pierwszego zestawu', async () => {
    const user = userEvent.setup();
    setup([]);

    expect(screen.getByText(pl.library.docs.sets.emptyTitle)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: pl.library.docs.sets.add })[1]!);

    expect(createMutate).toHaveBeenCalledWith(
      { name: pl.library.docs.sets.newName, sortOrder: 0 },
      expect.anything(),
    );
  });
});
