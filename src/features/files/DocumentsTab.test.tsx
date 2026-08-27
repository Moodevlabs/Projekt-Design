import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

const useFiles = vi.hoisted(() => vi.fn());
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));

vi.mock('@/data/queries/useFiles', () => ({
  useFiles,
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 1 }, isLoading: false }),
  useUploadFile: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRenameFile: mutationStub,
  useDeleteFile: mutationStub,
}));

vi.mock('@/lib/tauri', () => ({
  runningInTauri: () => false,
  saveFile: vi.fn(),
  openPath: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { DocumentsTab } = await import('./DocumentsTab');

function doc(partial: Partial<StoredFile> = {}): StoredFile {
  return {
    id: 'd1',
    workspaceId: 'ws',
    clientId: 'c1',
    projectId: null,
    quoteId: 'q1',
    siteVisitId: null,
    kind: 'generated',
    docType: 'quote',
    quoteVersion: null,
    name: 'wyc-2026-08-0001-kowalscy.pdf',
    mime: 'application/pdf',
    sizeBytes: 524_288,
    storagePath: 'ws/c1/_/d1.pdf',
    createdBy: null,
    deletedAt: null,
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    ...partial,
  };
}

function mockResult(rows: StoredFile[], overrides: Record<string, unknown> = {}) {
  useFiles.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

function lastFilters(): Record<string, unknown> {
  const calls = useFiles.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

describe('DocumentsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pyta WYLACZNIE o dokumenty wygenerowane, nie o wszystkie pliki', () => {
    mockResult([doc()]);
    render(<DocumentsTab clientId="c1" />);

    // Bez `kind: 'generated'` zakladka pokazywalaby tez rzuty i umowy —
    // a to inna lista i inne pytanie.
    expect(lastFilters()).toEqual({ clientId: 'c1', kind: 'generated' });
  });

  it('w projekcie zaweza sie do jego dokumentow', () => {
    mockResult([doc()]);
    render(<DocumentsTab clientId="c1" projectId="p1" />);
    expect(lastFilters()).toEqual({ projectId: 'p1', kind: 'generated' });
  });

  it('pokazuje nazwe, rodzaj dokumentu i rozmiar', () => {
    mockResult([doc()]);
    render(<DocumentsTab clientId="c1" />);

    expect(screen.getByText('wyc-2026-08-0001-kowalscy.pdf')).toBeInTheDocument();
    expect(screen.getByText(pl.documents.types.quote)).toBeInTheDocument();
    expect(screen.getByText('512 KB')).toBeInTheDocument();
  });

  it('rozroznia rodzaje dokumentow po polsku', () => {
    mockResult([
      doc({ id: 'a', docType: 'schedule', name: 'a.pdf' }),
      doc({ id: 'b', docType: 'price_list', name: 'b.pdf' }),
      doc({ id: 'c', docType: 'package', name: 'c.pdf' }),
    ]);
    render(<DocumentsTab clientId="c1" />);

    expect(screen.getByText(pl.documents.types.schedule)).toBeInTheDocument();
    expect(screen.getByText(pl.documents.types.price_list)).toBeInTheDocument();
    expect(screen.getByText(pl.documents.types.package)).toBeInTheDocument();
  });

  it('dokument bez rodzaju nie zostawia pustej kolumny', () => {
    mockResult([doc({ docType: null })]);
    render(<DocumentsTab clientId="c1" />);
    expect(screen.getByText(pl.documents.unknownType)).toBeInTheDocument();
  });

  it('mowi wprost, ze „Otworz" daje ZAPISANY plik, a nie nowy render', () => {
    mockResult([doc()]);
    render(<DocumentsTab clientId="c1" />);
    expect(screen.getByText(pl.documents.hint)).toBeInTheDocument();
  });

  it('pusty stan tlumaczy, skad sie biora dokumenty', () => {
    mockResult([]);
    render(<DocumentsTab clientId="c1" />);
    expect(screen.getByText(pl.documents.emptyTitle)).toBeInTheDocument();
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    mockResult([], { isError: true });
    render(<DocumentsTab clientId="c1" />);
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});
