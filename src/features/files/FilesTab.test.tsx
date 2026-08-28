import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoredFile } from '@/domain/files/schema';
import { MAX_FILE_BYTES } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

const useFiles = vi.hoisted(() => vi.fn());
const uploadMutateAsync = vi.hoisted(() =>
  vi.fn((_vars: Record<string, unknown>) => Promise.resolve()),
);
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useFiles', () => ({
  useFiles,
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 1 }, isLoading: false }),
  useUploadFile: () => ({ mutateAsync: uploadMutateAsync, isPending: false }),
  useRenameFile: mutationStub,
  useDeleteFile: mutationStub,
}));

// Bez Tauri — test chodzi w jsdom, czyli w tej samej scieżce co `pnpm dev`.
vi.mock('@/lib/tauri', () => ({
  runningInTauri: () => false,
  readFile: vi.fn(),
  openFilesDialog: vi.fn(),
  onFilesDropped: vi.fn(),
  fileNameFromPath: (path: string) => path,
  saveFile: vi.fn(),
  openPath: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: vi.fn() },
}));

const { FilesTab } = await import('./FilesTab');

function file(partial: Partial<StoredFile> = {}): StoredFile {
  return {
    id: 'f1',
    workspaceId: 'ws',
    clientId: 'c1',
    projectId: null,
    quoteId: null,
    siteVisitId: null,
    kind: 'upload',
    docType: null,
    quoteVersion: null,
    name: 'rzut-parteru.pdf',
    mime: 'application/pdf',
    sizeBytes: 2_516_582,
    storagePath: 'ws/c1/_/f1.pdf',
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

/** Ostatnie filtry, z jakimi komponent zawolal hooka. */
function lastFilters(): Record<string, unknown> {
  const calls = useFiles.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

function makeFile(name: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

describe('FilesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje plik z nazwa, rozmiarem po ludzku i data', () => {
    mockResult([file()]);
    render(<FilesTab clientId="c1" />);

    expect(screen.getByText('rzut-parteru.pdf')).toBeInTheDocument();
    expect(screen.getByText('2,4 MB')).toBeInTheDocument();
  });

  it('zakladka klienta pyta o jego pliki, zakladka projektu — o pliki teczki', () => {
    mockResult([file()]);
    const { rerender } = render(<FilesTab clientId="c1" />);
    expect(lastFilters()).toEqual({ clientId: 'c1' });

    rerender(<FilesTab clientId="c1" projectId="p1" />);
    expect(lastFilters()).toEqual({ projectId: 'p1' });
  });

  it('u klienta widac, czy plik nalezy do teczki; w projekcie ta kolumna jest zbedna', () => {
    mockResult([file({ projectId: 'p1' })]);
    const { rerender } = render(<FilesTab clientId="c1" />);
    expect(screen.getByText(pl.files.scopeProject)).toBeInTheDocument();

    rerender(<FilesTab clientId="c1" projectId="p1" />);
    expect(screen.queryByText(pl.files.scopeProject)).not.toBeInTheDocument();
  });

  it('pusta lista zacheca do dodania plikow', () => {
    mockResult([]);
    render(<FilesTab clientId="c1" />);
    expect(screen.getByText(pl.files.emptyTitle)).toBeInTheDocument();
  });

  it('odbija za duzy plik PRZED wyslaniem i mowi to po polsku', async () => {
    mockResult([]);
    render(<FilesTab clientId="c1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('film.mp4', MAX_FILE_BYTES + 1));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(pl.files.rejectedTooLarge('film.mp4'));
    });
    // Sedno: do Storage nie poszlo nic.
    expect(uploadMutateAsync).not.toHaveBeenCalled();
  });

  it('odbija plik wykonywalny po ROZSZERZENIU, nie po MIME', async () => {
    mockResult([]);
    render(<FilesTab clientId="c1" />);

    // MIME mowi „application/pdf", ale nazwa mowi `.exe` — wierzymy nazwie.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('setup.exe', 1024));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(pl.files.rejectedExtension('setup.exe'));
    });
    expect(uploadMutateAsync).not.toHaveBeenCalled();
  });

  it('wysyla poprawny plik z przypisaniem do klienta i projektu', async () => {
    mockResult([]);
    render(<FilesTab clientId="c1" projectId="p1" />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, makeFile('rzut.pdf', 2048));

    await waitFor(() => expect(uploadMutateAsync).toHaveBeenCalledTimes(1));
    expect(uploadMutateAsync.mock.calls[0]?.[0]).toMatchObject({
      clientId: 'c1',
      projectId: 'p1',
      name: 'rzut.pdf',
    });
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    mockResult([], { isError: true });
    render(<FilesTab clientId="c1" />);

    expect(screen.getByText(new RegExp(pl.files.loadError))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});

describe('FilesTab — jedna lista, filtr rodzaju (T-110)', () => {
  it('wygenerowany PDF lezy w tej samej liscie co pliki wgrane, z typem i wersja', () => {
    mockResult([
      file({ id: 'u1', name: 'rzut.dwg', kind: 'upload', docType: null }),
      file({
        id: 'g1',
        name: 'WYC-0001-wycena.pdf',
        kind: 'generated',
        docType: 'quote',
        quoteVersion: 2,
      }),
    ]);
    render(<FilesTab clientId="c1" />);

    expect(screen.getByText('rzut.dwg')).toBeInTheDocument();
    expect(screen.getByText('WYC-0001-wycena.pdf')).toBeInTheDocument();
    expect(screen.getByText(pl.documents.types.quote)).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
  });

  it('filtr „Wygenerowane PDF” chowa pliki wgrane', async () => {
    const user = userEvent.setup();
    mockResult([
      file({ id: 'u1', name: 'rzut.dwg', kind: 'upload', docType: null }),
      file({ id: 'g1', name: 'termin.pdf', kind: 'generated', docType: 'schedule' }),
    ]);
    render(<FilesTab clientId="c1" />);

    await user.click(screen.getByRole('button', { name: pl.files.kindGenerated }));
    expect(screen.queryByText('rzut.dwg')).not.toBeInTheDocument();
    expect(screen.getByText('termin.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.files.kindUpload }));
    expect(screen.getByText('rzut.dwg')).toBeInTheDocument();
    expect(screen.queryByText('termin.pdf')).not.toBeInTheDocument();
  });
});
