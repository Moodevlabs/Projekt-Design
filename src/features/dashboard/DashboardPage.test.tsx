import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { pl } from '@/i18n/pl';

const useQuotesList = vi.hoisted(() => vi.fn());
const useSubscription = vi.hoisted(() => vi.fn());

const useBrandKit = vi.hoisted(() => vi.fn(() => ({ isSuccess: true, data: null })));
const useAllLibraryItems = vi.hoisted(() => vi.fn(() => ({ isSuccess: true, data: [] })));

vi.mock('@/data/queries/useQuotes', () => ({ useQuotesList }));
vi.mock('@/data/queries/useSubscription', () => ({ useSubscription }));
vi.mock('@/data/queries/useBrandKit', () => ({ useBrandKit }));
vi.mock('@/data/queries/useLibrary', () => ({ useAllLibraryItems }));

// Blok „Aktywni klienci i projekty" (T-58) pyta o teczki.
vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/data/queries/useClients', () => ({
  useCreateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const { DashboardPage } = await import('./DashboardPage');

/** Wycena utworzona w bieżącym miesiącu — statystyki liczą po `createdAt`. */
function quote(partial: Partial<QuoteSummary> = {}): QuoteSummary {
  const nowIso = new Date().toISOString();
  return {
    id: 'q1',
    workspaceId: 'ws',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    number: 'WYC/2026/08/0001',
    title: 'Remont kuchni',
    status: 'accepted',
    totalNetCents: 620_000,
    totalGrossCents: 762_600,
    currency: 'PLN',
    clientName: 'Anna Kowalska',
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    ...partial,
  };
}

function mockQuotes(rows: QuoteSummary[] | undefined, overrides: Record<string, unknown> = {}) {
  useQuotesList.mockReturnValue({
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
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Liczniki respektują prefers-reduced-motion — w testach wyłączamy animację,
    // żeby asercje widziały od razu wartości końcowe.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    useSubscription.mockReturnValue({
      data: {
        workspaceId: 'ws',
        status: 'trialing',
        plan: null,
        trialEndsAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
      },
      isLoading: false,
    });
  });

  it('bez żadnej wyceny pokazuje zaproszenie z akcją, nie pusty bilans', () => {
    mockQuotes([]);
    renderPage();

    expect(screen.getByText(pl.dashboard.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.emptyLead)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: new RegExp(pl.quotes.new) });
    expect(cta).toHaveAttribute('href', '/wyceny/nowa');

    // Bilans miesiąca nie ma czego liczyć — nie renderuje się.
    expect(screen.queryByText(pl.dashboard.sentToClients)).not.toBeInTheDocument();

    // Subskrypcja zostaje w szynie także na pustym pulpicie.
    expect(screen.getByText(pl.billing.trial)).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.trialDaysLeft(5))).toBeInTheDocument();
  });

  it('pokazuje bilans miesiąca: sumę wysłanych, odpowiedzi i ostatnie wyceny', () => {
    mockQuotes([
      quote(),
      quote({ id: 'q2', title: 'Ogród zimowy', status: 'rejected', totalNetCents: 150_000 }),
    ]);
    renderPage();

    // Suma wysłanych = tylko zaakceptowana (6 200 zł); pojawia się też w wierszu listy.
    expect(screen.getByText(pl.dashboard.sentToClients)).toBeInTheDocument();
    expect(screen.getAllByText(/6\s?200,00/).length).toBeGreaterThanOrEqual(2);

    // Odpowiedzi klientów: 1 z 2 na TAK = 50%.
    expect(screen.getByText(pl.dashboard.settledOnYes(1, 2))).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Wiersz listy prowadzi do edytora.
    const row = screen.getByRole('link', { name: /Remont kuchni/ });
    expect(row).toHaveAttribute('href', '/wyceny/q1');
  });

  it('w trakcie ładowania panele są oznaczone aria-busy i pokazują szkielety', () => {
    mockQuotes(undefined, { isLoading: true });
    const { container } = renderPage();

    expect(container.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(pl.dashboard.emptyTitle)).not.toBeInTheDocument();
  });

  it('przy błędzie pokazuje komunikat i pozwala ponowić', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockQuotes(undefined, { isError: true, refetch });
    renderPage();

    expect(screen.getByText(pl.quotes.loadError)).toBeInTheDocument();
    expect(screen.queryByText(pl.dashboard.sentToClients)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.common.retry }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
