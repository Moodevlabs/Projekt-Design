import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocLibraryEntry } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

const entries = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('@/data/queries/useLibraryDocs', () => ({
  useDocLibraryEntries: () => ({ entries: entries.current, isLoading: false, isError: false }),
}));

const { DocLibraryPanel } = await import('./DocLibraryPanel');

function wpis(name: string, sectionLabel = ''): DocLibraryEntry<'stages'> {
  return {
    id: `e-${name}`,
    workspaceId: 'ws-1',
    kind: 'stages',
    name,
    payload: { name, description: '', included: true, sectionLabel, linkedItemTags: [] },
    sortOrder: 0,
    isSample: false,
  };
}

beforeEach(() => {
  entries.current = [wpis('Inwentaryzacja', 'Zakres ogólny'), wpis('Moodboard', 'Etap wizualny')];
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
