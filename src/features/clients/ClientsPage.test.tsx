import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientOverview } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

const useClients = vi.hoisted(() => vi.fn());
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));
const asyncMutationStub = vi.hoisted(() => () => ({
  mutateAsync: vi.fn(() => Promise.resolve()),
  isPending: false,
}));

vi.mock('@/data/queries/useClients', () => ({
  useClients,
  useCreateClient: asyncMutationStub,
  useUpdateClient: asyncMutationStub,
  useSetClientStatus: mutationStub,
  useDeleteClient: mutationStub,
  // Import z CSV (T-23) — dialog montuje sie zawsze, wiec hook musi istniec.
  useImportClients: mutationStub,
}));

vi.mock('@/data/queries/useQuotes', () => ({
  useCreateQuote: asyncMutationStub,
}));

// Zdjecia klientow (poprawka 5) — karta pyta o podpisany URL.
vi.mock('@/data/queries/useClientAvatar', () => ({
  useClientAvatarUrl: () => ({ data: null }),
  useUploadClientAvatar: mutationStub,
  useRemoveClientAvatar: mutationStub,
}));

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { id: 'ws', settings: {} } }),
  useWorkspaceId: () => 'ws',
}));

const { ClientsPage } = await import('./ClientsPage');

function overview(partial: Partial<ClientOverview> = {}): ClientOverview {
  return {
    id: 'c1',
    workspaceId: 'ws',
    name: 'Anna i Piotr Kowalscy',
    phone: '600 100 200',
    email: 'anna@example.com',
    address: '',
    city: 'Poznań',
    notes: '',
    avatarPath: null,
    status: 'active',
    archivedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    quotesCount: 3,
    projectsCount: 2,
    acceptedNetCents: 1_250_000,
    lastActivityAt: new Date().toISOString(),
    ...partial,
  };
}

function mockResult(rows: ClientOverview[], overrides: Record<string, unknown> = {}) {
  useClients.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ClientsPage />
    </MemoryRouter>,
  );
}

/** Ostatnie filtry, z jakimi komponent zawolal hooka. */
function lastFilters(): Record<string, unknown> {
  const calls = useClients.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

describe('ClientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje klienta z kontaktem, liczba wycen i wartoscia zaakceptowanych', () => {
    mockResult([overview()]);
    renderPage();

    expect(screen.getByText('Anna i Piotr Kowalscy')).toBeInTheDocument();
    expect(screen.getByText(/600 100 200/)).toBeInTheDocument();
    expect(screen.getByText('Poznań')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    // 1 250 000 gr = 12 500 zl.
    expect(screen.getByText(/12\s?500,00/)).toBeInTheDocument();
  });

  it('prowadzi z wiersza do karty klienta', () => {
    mockResult([overview()]);
    renderPage();

    expect(screen.getByRole('link', { name: 'Anna i Piotr Kowalscy' })).toHaveAttribute(
      'href',
      '/klienci/c1',
    );
  });

  it('kazdy klient dostaje wlasna karte z inicjalami (poprawka 5)', () => {
    mockResult([overview(), overview({ id: 'c2', name: 'Jan Nowak' })]);
    renderPage();

    // Od 2026-08-27 lista to siatka kart, nie tabela — wiersze z kolumnami
    // sluza do porownywania liczb, a klienta sie na liscie ODNAJDUJE.
    expect(screen.getAllByTestId('client-card')).toHaveLength(2);
    // Bez wgranego zdjecia kolko pokazuje skrot nazwy, a nie pusta plame.
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('JN')).toBeInTheDocument();
  });

  it('startuje na aktywnych — zarchiwizowani nie zasmiecaja listy', () => {
    mockResult([overview()]);
    renderPage();
    expect(lastFilters().status).toBe('active');
  });

  it('przekazuje fraze wyszukiwania do zapytania, a nie filtruje w przegladarce', async () => {
    const user = userEvent.setup();
    mockResult([overview()]);
    renderPage();

    // Kryterium odbioru T-53: szukanie po fragmencie e-maila dziala po stronie bazy.
    await user.type(screen.getByLabelText(pl.clients.searchPlaceholder), 'anna@');
    expect(lastFilters().search).toBe('anna@');
  });

  it('nie wysyla pustej frazy jako filtra', async () => {
    const user = userEvent.setup();
    mockResult([overview()]);
    renderPage();

    await user.type(screen.getByLabelText(pl.clients.searchPlaceholder), '   ');
    expect(lastFilters().search).toBeUndefined();
  });

  it('przelacza filtr statusu na zarchiwizowanych', async () => {
    const user = userEvent.setup();
    mockResult([overview()]);
    renderPage();

    await user.click(screen.getByRole('button', { name: pl.clients.filters.archived }));
    expect(lastFilters().status).toBe('archived');
  });

  it('rozroznia pusta kartoteke od pustego wyniku filtrowania', async () => {
    const user = userEvent.setup();
    mockResult([]);
    const { rerender } = renderPage();

    expect(screen.getByText(pl.clients.emptyTitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.clients.filters.archived }));
    rerender(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(pl.clients.noResultsTitle)).toBeInTheDocument();
  });

  it('liczy wyniki z polska odmiana', () => {
    mockResult([overview({ id: 'a' }), overview({ id: 'b' }), overview({ id: 'c' })]);
    renderPage();
    expect(screen.getByText('3 klienci')).toBeInTheDocument();
  });

  it('daje kazdemu wierszowi menu akcji', () => {
    mockResult([overview({ id: 'a', name: 'Pierwszy' }), overview({ id: 'b', name: 'Drugi' })]);
    renderPage();

    expect(
      screen.getByRole('button', { name: `${pl.clients.rowActions}: Pierwszy` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${pl.clients.rowActions}: Drugi` }),
    ).toBeInTheDocument();
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    mockResult([], { isError: true });
    renderPage();

    expect(screen.getByText(new RegExp(pl.clients.loadError))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});
