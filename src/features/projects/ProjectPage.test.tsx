import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectOverview } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

const useProjectOverview = vi.hoisted(() => vi.fn());
const useQuotesList = vi.hoisted(() =>
  vi.fn(() => ({ data: [], isLoading: false, isError: false })),
);
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
const asyncMutationStub = vi.hoisted(() => () => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
}));

vi.mock('@/data/queries/useFiles', () => ({
  useFiles: () => ({ data: [], isLoading: false, isError: false }),
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 1 }, isLoading: false }),
  useUploadFile: asyncMutationStub,
  useRenameFile: mutationStub,
  useDeleteFile: mutationStub,
}));

vi.mock('@/data/queries/useProjects', () => ({
  useProjectOverview,
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
  useProject: () => ({ data: null }),
  useCreateProject: asyncMutationStub,
  useUpdateProject: asyncMutationStub,
  useSetProjectStatus: mutationStub,
  useDeleteProject: mutationStub,
  useMoveQuoteToProject: mutationStub,
}));

vi.mock('@/data/queries/useClients', () => ({
  useClient: () => ({ data: null }),
  useClients: () => ({ data: [] }),
  useCreateClient: asyncMutationStub,
  useUpdateClient: asyncMutationStub,
  useSetClientStatus: mutationStub,
  useDeleteClient: mutationStub,
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useQuotesList,
  useCreateQuote: asyncMutationStub,
  useSetQuoteRegisterFields: mutationStub,
  useDuplicateQuote: mutationStub,
  useArchiveQuote: mutationStub,
  useSetQuoteStatus: mutationStub,
}));

// Karta „klient przyjal oferte" (T-26) pyta o akceptacje i uwagi. To warstwa
// danych — sama karta ma wlasny test.
vi.mock('@/data/queries/useShares', () => ({
  useQuoteAcceptance: () => ({ data: null }),
  useQuoteComments: () => ({ data: [] }),
  useMarkCommentRead: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { id: 'ws', settings: {} } }),
  useWorkspaceId: () => 'ws',
}));

const { ProjectPage } = await import('./ProjectPage');

function overview(partial: Partial<ProjectOverview> = {}): ProjectOverview {
  return {
    id: 'p1',
    workspaceId: 'ws',
    clientId: 'c1',
    name: 'Dom 164 m² — Konstancin',
    address: 'ul. Sosnowa 8',
    city: 'Konstancin',
    areaM2: 164,
    kind: 'house',
    status: 'lead',
    startDate: null,
    notes: 'Czekamy na rzuty.',
    sortOrder: 0,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    stageProgress: {},
    clientName: 'Marta i Piotr Kowalscy',
    clientAvatarPath: null,
    quotesCount: 2,
    acceptedNetCents: 450_000,
    lastActivityAt: new Date().toISOString(),
    ...partial,
  };
}

function renderPage(data: ProjectOverview | null) {
  useProjectOverview.mockReturnValue({
    data,
    isLoading: false,
    isError: data === null,
  });

  return render(
    <MemoryRouter initialEntries={['/klienci/c1/projekty/p1']}>
      <Routes>
        <Route path="/klienci/:id/projekty/:projectId" element={<ProjectPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje nazwe, klienta, metraz i adres', () => {
    renderPage(overview());

    expect(screen.getByRole('heading', { name: 'Dom 164 m² — Konstancin' })).toBeInTheDocument();
    expect(screen.getAllByText(/Marta i Piotr Kowalscy/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dom · 164 m²/)).toBeInTheDocument();
    expect(screen.getByText(/ul\. Sosnowa 8, Konstancin/)).toBeInTheDocument();
  });

  it('sumy z bazy: liczba wycen i wartosc zaakceptowanych', () => {
    renderPage(overview());

    expect(screen.getByText('2')).toBeInTheDocument();
    // 450 000 gr = 4 500 zl.
    expect(screen.getByText(/4\s?500,00/)).toBeInTheDocument();
  });

  it('prowadzi z powrotem do karty klienta, a nie do listy klientow', () => {
    renderPage(overview());

    const links = screen.getAllByRole('link', { name: /Marta i Piotr Kowalscy/ });
    expect(links[0]).toHaveAttribute('href', '/klienci/c1');
  });

  it('ma zakladki Wyceny, Etapy, Dokumenty, Pliki i Notatki — i tylko te', () => {
    // „Termin" jest zakladka WYCENY, nie projektu — harmonogram dotyczy
    // konkretnej oferty i duplikowanie go tutaj daloby dwa zrodla tej samej daty.
    //
    // „Etapy" (T-68) NIE lamia tej zasady: pokazuja POSTEP realizacji etapow
    // pobranych z harmonogramu zaakceptowanej wyceny, a nie drugi harmonogram.
    // Zrodlo dat zostaje jedno.
    //
    // Ten test jest strazniekiem przed rozrostem: Toolier ma nie zostac
    // systemem project-management (koncepcja §17). Kazda kolejna zakladka
    // wymaga swiadomej zmiany tej listy.
    renderPage(overview());

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);
    expect(tabs).toEqual([
      pl.projects.tabQuotes,
      pl.stages.tab,
      pl.documents.tab,
      pl.files.tab,
      pl.projects.tabNotes,
    ]);
  });

  it('status da sie przestawic z naglowka, bez wchodzenia w edycje', () => {
    renderPage(overview());

    const status = screen.getAllByRole('combobox', { name: pl.projects.statusLabel })[0];
    expect(status).toHaveTextContent(pl.projects.status.lead);
  });

  it('pusty projekt pokazuje pusty stan wycen z akcja', () => {
    renderPage(overview({ quotesCount: 0 }));
    expect(screen.getByText(pl.projects.quotesEmptyTitle)).toBeInTheDocument();
  });

  it('brak metrazu nie udaje zera', () => {
    // Nazwa bez „m²", zeby test mierzyl wiersz metadanych, a nie naglowek.
    renderPage(overview({ name: 'Teczka bez metrazu', areaM2: null, kind: '' }));
    expect(screen.queryByText(/m²/)).not.toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('nie znaleziono projektu — komunikat i droga powrotna, nie bialy ekran', () => {
    renderPage(null);

    expect(screen.getByText(pl.projects.notFoundTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: pl.clients.backToList })).toHaveAttribute(
      'href',
      '/klienci/c1',
    );
  });
});
