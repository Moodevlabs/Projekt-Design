import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientOverview } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

const useClientOverview = vi.hoisted(() => vi.fn());
const useQuotesList = vi.hoisted(() => vi.fn(() => ({ data: [], isLoading: false, isError: false })));
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
const asyncMutationStub = vi.hoisted(() => () => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
}));

vi.mock('@/data/queries/useClients', () => ({
  useClientOverview,
  useClients: () => ({ data: [] }),
  useCreateClient: asyncMutationStub,
  useUpdateClient: asyncMutationStub,
  useSetClientStatus: mutationStub,
  useDeleteClient: mutationStub,
}));

vi.mock('@/data/queries/useFiles', () => ({
  useFiles: () => ({ data: [], isLoading: false, isError: false }),
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 1 }, isLoading: false }),
  useUploadFile: asyncMutationStub,
  useRenameFile: mutationStub,
  useDeleteFile: mutationStub,
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
  useProject: () => ({ data: null }),
  useProjectOverview: () => ({ data: null }),
  useCreateProject: asyncMutationStub,
  useUpdateProject: asyncMutationStub,
  useSetProjectStatus: mutationStub,
  useDeleteProject: mutationStub,
  useMoveQuoteToProject: mutationStub,
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useQuotesList,
  useCreateQuote: asyncMutationStub,
  useSetQuoteRegisterFields: mutationStub,
  useDuplicateQuote: mutationStub,
  useArchiveQuote: mutationStub,
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { id: 'ws', settings: {} } }),
  useWorkspaceId: () => 'ws',
}));

const { ClientPage } = await import('./ClientPage');

function overview(partial: Partial<ClientOverview> = {}): ClientOverview {
  return {
    id: 'c1',
    workspaceId: 'ws',
    name: 'Anna i Piotr Kowalscy',
    phone: '600 100 200',
    email: 'anna@example.com',
    address: 'ul. Wiosenna 12/3',
    city: 'Poznań',
    notes: 'Lubią jasne drewno.',
    avatarPath: null,
    status: 'active',
    archivedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    quotesCount: 2,
    projectsCount: 1,
    acceptedNetCents: 980_000,
    lastActivityAt: new Date().toISOString(),
    ...partial,
  };
}

function renderPage(data: ClientOverview | null, overrides: Record<string, unknown> = {}) {
  useClientOverview.mockReturnValue({
    data,
    isLoading: false,
    isError: data === null,
    ...overrides,
  });

  return render(
    <MemoryRouter initialEntries={['/klienci/c1']}>
      <Routes>
        <Route path="/klienci/:id" element={<ClientPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje naglowek z kontaktem, adresem i sumami z bazy', () => {
    renderPage(overview());

    expect(screen.getByRole('heading', { name: 'Anna i Piotr Kowalscy' })).toBeInTheDocument();
    expect(screen.getByText(/600 100 200/)).toBeInTheDocument();
    expect(screen.getByText(/ul\. Wiosenna 12\/3, Poznań/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // 980 000 gr = 9 800 zl.
    expect(screen.getByText(/9\s?800,00/)).toBeInTheDocument();
  });

  it('ma zakladki Projekty, Wyceny, Pliki i Notatki', () => {
    renderPage(overview());

    expect(screen.getByRole('tab', { name: pl.files.tab })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: pl.clients.tabProjects })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: pl.clients.tabQuotes })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: pl.clients.tabNotes })).toBeInTheDocument();
  });

  it('ma komplet zakladek z 05-UI §3 i nic ponadto', () => {
    // Zakladka bez funkcji sie nie renderuje (05-UI §3a.8, zasada z T-44) —
    // od T-56 komplet jest juz pelny.
    renderPage(overview());

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual([
      pl.clients.tabProjects,
      // Brief stoi PRZED wycenami (poprawka 9): w kolejnosci wspolpracy jest
      // pierwszy — dopiero z jego odpowiedzi wiadomo, co wycenic.
      pl.brief.tab,
      pl.clients.tabQuotes,
      pl.documents.tab,
      pl.files.tab,
      pl.clients.tabNotes,
    ]);
  });

  it('domyslna zakladka to Projekty — pusty stan z akcja', () => {
    renderPage(overview({ projectsCount: 0 }));
    expect(screen.getByText(pl.clients.projectsEmptyTitle)).toBeInTheDocument();
  });

  it('oznacza zarchiwizowanego klienta', () => {
    renderPage(overview({ status: 'archived' }));
    expect(screen.getByText(pl.clients.status.archived)).toBeInTheDocument();
  });

  it('nie znaleziono klienta — komunikat i droga powrotna, nie bialy ekran', () => {
    renderPage(null);

    expect(screen.getByText(pl.clients.notFoundTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: pl.clients.backToList })).toHaveAttribute(
      'href',
      '/klienci',
    );
  });
});
