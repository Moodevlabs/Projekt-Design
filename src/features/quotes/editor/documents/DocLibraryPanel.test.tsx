import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocLibraryEntry } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

const entries = vi.hoisted(() => ({ current: [] as unknown[] }));
const sets = vi.hoisted(() => ({ current: [] as unknown[] }));
const categories = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('@/data/queries/useLibraryDocs', () => ({
  useDocLibraryEntries: () => ({ entries: entries.current, isLoading: false, isError: false }),
}));

/*
 * Grupy i zestawy bibliotek dokumentow (T-121). Panel „Dodaj z biblioteki"
 * pyta o nie razem z wpisami — test komponentu izoluje sie od TanStack Query.
 */
vi.mock('@/data/queries/useLibraryDocGroups', () => ({
  useDocCategories: () => ({ data: categories.current, isLoading: false, isError: false }),
  useDocCategoryMap: () => new Map(),
  useDocSets: () => ({ data: sets.current, isLoading: false, isError: false }),
  useSetDocEntryCategory: () => ({ mutate: vi.fn(), isPending: false }),
  // „Zapisz jako zestaw" w pasku akcji dokumentu (T-122).
  useCreateDocSet: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { DocLibraryPanel } = await import('./DocLibraryPanel');

function wpis(name: string, sectionLabel = ''): DocLibraryEntry<'stages'> {
  return {
    id: `e-${name}`,
    workspaceId: 'ws-1',
    kind: 'stages',
    name,
    payload: { name, description: '', included: true, sectionLabel, linkedItemTags: [] },
    categoryId: null,
    sortOrder: 0,
    isSample: false,
  };
}

beforeEach(() => {
  entries.current = [wpis('Inwentaryzacja', 'Zakres ogólny'), wpis('Moodboard', 'Etap wizualny')];
  sets.current = [];
  categories.current = [];
});

describe('DocLibraryPanel — „Dodaj z biblioteki" (T-103)', () => {
  it('klikniecie dodaje wpis od razu i panel zostaje otwarty', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    const onOpenChange = vi.fn();
    render(<DocLibraryPanel kind="stages" open onOpenChange={onOpenChange} onInsert={onInsert} />);

    await user.click(
      screen.getByRole('button', { name: pl.editor.docLibrary.addLabel('Moodboard') }),
    );

    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Moodboard' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    // Ten sam wpis moze wejsc dwa razy — jak usluga w wycenie.
    await user.click(
      screen.getByRole('button', { name: pl.editor.docLibrary.addLabel('Moodboard') }),
    );
    expect(onInsert).toHaveBeenCalledTimes(2);
  });

  it('„Dodaj wszystkie" wstawia to, co widac po filtrze', async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(<DocLibraryPanel kind="stages" open onOpenChange={vi.fn()} onInsert={onInsert} />);

    await user.type(screen.getByLabelText(pl.editor.docLibrary.search), 'mood');
    await user.click(screen.getByRole('button', { name: pl.editor.docLibrary.addAll(1) }));

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ name: 'Moodboard' }));
  });

  it('pusta biblioteka mowi, gdzie ja uzupelnic, zamiast pokazywac pusta liste', () => {
    entries.current = [];
    render(<DocLibraryPanel kind="stages" open onOpenChange={vi.fn()} onInsert={vi.fn()} />);
    expect(screen.getByText(pl.editor.docLibrary.empty)).toBeInTheDocument();
  });
});

/**
 * T-121: panel dostaje drugą półkę (zestawy) i filtr grup. Zestaw wchodzi
 * przez to samo `onInsert`, wpis po wpisie — dokument nie zna pojęcia zestawu.
 */
describe('DocLibraryPanel — grupy i zestawy (T-121)', () => {
  it('zestaw wstawia wszystkie swoje wpisy jednym kliknięciem', async () => {
    const user = userEvent.setup();
    sets.current = [
      {
        id: 's1',
        workspaceId: 'ws-1',
        kind: 'stages',
        name: 'Pełny proces',
        items: [wpis('Koncepcja').payload, wpis('Projekt').payload],
        sortOrder: 0,
        isSample: false,
      },
    ];

    const onInsert = vi.fn();
    render(
      <DocLibraryPanel kind="stages" open onOpenChange={() => undefined} onInsert={onInsert} />,
    );

    await user.click(screen.getByRole('tab', { name: pl.library.docs.subtabs.sets }));
    await user.click(
      screen.getByRole('button', { name: pl.editor.docLibrary.addLabel('Pełny proces') }),
    );

    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onInsert.mock.calls.map((call) => (call[0] as { name: string }).name)).toEqual([
      'Koncepcja',
      'Projekt',
    ]);
  });

  it('pusta półka zestawów mówi o tym wprost', async () => {
    const user = userEvent.setup();
    render(
      <DocLibraryPanel
        kind="stages"
        open
        onOpenChange={() => undefined}
        onInsert={() => undefined}
      />,
    );

    await user.click(screen.getByRole('tab', { name: pl.library.docs.subtabs.sets }));

    expect(screen.getByText(pl.library.docs.sets.emptyTitle)).toBeInTheDocument();
  });

  it('filtr grup zawęża listę wpisów', async () => {
    const user = userEvent.setup();
    categories.current = [
      { id: 'c1', workspaceId: 'ws-1', kind: 'stages', name: 'Koncepcja', code: '', color: null, sortOrder: 0, isSample: false },
      { id: 'c2', workspaceId: 'ws-1', kind: 'stages', name: 'Nadzór', code: '', color: null, sortOrder: 1, isSample: false },
    ];
    entries.current = [
      { ...wpis('Inwentaryzacja'), categoryId: 'c1' },
      { ...wpis('Wizyty na budowie'), categoryId: 'c2' },
    ];

    render(
      <DocLibraryPanel
        kind="stages"
        open
        onOpenChange={() => undefined}
        onInsert={() => undefined}
      />,
    );

    expect(screen.getByText('Wizyty na budowie')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Koncepcja' }));

    expect(screen.getByText('Inwentaryzacja')).toBeInTheDocument();
    expect(screen.queryByText('Wizyty na budowie')).not.toBeInTheDocument();
  });
});
