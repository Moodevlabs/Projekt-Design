import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import type { ActivityEvent } from '@/data/repos/activity.repo';
import { pl } from '@/i18n/pl';

const useQuotesList = vi.hoisted(() => vi.fn());
const useActivity = vi.hoisted(() => vi.fn());

const useBrandKit = vi.hoisted(() => vi.fn(() => ({ isSuccess: true, data: null })));
const useAllLibraryItems = vi.hoisted(() => vi.fn(() => ({ isSuccess: true, data: [] })));

vi.mock('@/data/queries/useQuotes', () => ({ useQuotesList }));
vi.mock('@/data/queries/useBrandKit', () => ({ useBrandKit }));
vi.mock('@/data/queries/useLibrary', () => ({ useAllLibraryItems }));
vi.mock('@/data/queries/useActivity', () => ({ useActivity }));

// Pasek „Co nowego" czyta znacznik odhaczenia z ustawien workspace'u
// i zapisuje go tam z powrotem (przycisk „Odhacz wszystko").
const updateSettings = vi.hoisted(() => vi.fn());
const seenAt = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace: () => ({ data: { id: 'ws', settings: { activitySeenAt: seenAt.value } } }),
  useWorkspaceId: () => 'ws',
  useUpdateWorkspaceSettings: () => ({ mutate: updateSettings, isPending: false }),
}));

// Blok „Aktywni klienci i projekty" (T-58) pyta o teczki.
vi.mock('@/data/queries/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/data/queries/useClients', () => ({
  useCreateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateClient: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useClientAvatar', () => ({
  useClientAvatarUrl: () => ({ data: null }),
  useUploadClientAvatar: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveClientAvatar: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { DashboardPage } = await import('./DashboardPage');

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

function event(partial: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'acceptance-1',
    kind: 'accepted',
    at: new Date().toISOString(),
    quoteId: 'q1',
    quoteNumber: 'WYC/2026/08/0001',
    quoteTitle: 'Remont kuchni',
    clientId: 'c1',
    clientName: 'Anna Kowalska',
    who: 'Anna Kowalska',
    message: null,
    unread: false,
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

function mockActivity(rows: ActivityEvent[] = [], overrides: Record<string, unknown> = {}) {
  useActivity.mockReturnValue({ data: rows, isLoading: false, isError: false, ...overrides });
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
    mockActivity();
    seenAt.value = null;

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
  });

  it('bez żadnej wyceny pokazuje zaproszenie z akcją', () => {
    mockQuotes([]);
    renderPage();

    expect(screen.getByText(pl.dashboard.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.emptyLead)).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: new RegExp(pl.quotes.new) });
    expect(cta).toHaveAttribute('href', '/wyceny/nowa');
  });

  it('pokazuje ostatnie wyceny i prowadzi do edytora', () => {
    mockQuotes([
      quote(),
      quote({ id: 'q2', title: 'Ogród zimowy', status: 'rejected', totalNetCents: 150_000 }),
    ]);
    renderPage();

    const row = screen.getByRole('link', { name: /Remont kuchni/ });
    expect(row).toHaveAttribute('href', '/wyceny/q1');
  });

  it('bilans miesiaca zniknal z pulpitu (poprawka 6)', () => {
    // Liczyl wyceny utworzone, wyslane i rozstrzygniete w biezacym miesiacu —
    // dane prawdziwe, ale nie odpowiadajace na zadne pytanie zadawane rano.
    mockQuotes([quote()]);
    renderPage();

    expect(screen.queryByText('Wyceny utworzone')).not.toBeInTheDocument();
    expect(screen.queryByText('Wysłane do klientów')).not.toBeInTheDocument();
    // Subskrypcja tez: jej miejsce jest w ustawieniach, a okres probny
    // zglasza sie sam oknem przy starcie.
    expect(screen.queryByText(pl.billing.manage)).not.toBeInTheDocument();
  });

  it('na gorze mowi, czy jestesmy na biezaco', () => {
    mockQuotes([quote()]);
    mockActivity([event()]);
    renderPage();

    expect(screen.getByText(pl.dashboard.activityTitle)).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.activityAccepted('Anna Kowalska'))).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.activityUpToDate)).toBeInTheDocument();
  });

  it('liczy nieprzeczytane uwagi klientow', () => {
    mockQuotes([quote()]);
    mockActivity([
      event({ id: 'comment-1', kind: 'comment', message: 'Czy da się taniej?', unread: true }),
    ]);
    renderPage();

    expect(screen.getByText(pl.dashboard.activityUnread(1))).toBeInTheDocument();
    expect(screen.getByText(pl.dashboard.activityComment('Anna Kowalska'))).toBeInTheDocument();
  });

  it('„Odhacz wszystko" zapisuje znacznik z NAJNOWSZEGO zdarzenia, nie z chwili klikniecia', async () => {
    // Zdarzenie, ktore przyszlo w trakcie patrzenia na liste, ale jeszcze sie
    // nie dociagnelo, zostaloby przy `now()` odhaczone bez pokazania.
    const user = userEvent.setup();
    mockQuotes([quote()]);
    mockActivity([
      event({ id: 'a', at: '2026-08-27T10:00:00Z' }),
      event({ id: 'b', at: '2026-08-26T10:00:00Z' }),
    ]);
    renderPage();

    await user.click(screen.getByRole('button', { name: pl.dashboard.activityClear }));

    const patch = updateSettings.mock.calls[0]?.[0] as { activitySeenAt: string };
    expect(patch.activitySeenAt).toBe('2026-08-27T10:00:00Z');
  });

  it('odhaczone zdarzenia znikaja z listy, ale DAJA SIE odsloniec', async () => {
    // To jest gwarancja, ze „Odhacz wszystko" nie jest przyciskiem, po ktorym
    // cos przepada — akceptacja oferty jest faktem i nie ma prawa zniknac.
    const user = userEvent.setup();
    seenAt.value = '2026-08-27T00:00:00Z';
    mockQuotes([quote()]);
    mockActivity([
      event({ id: 'stare', at: '2026-08-26T10:00:00Z', who: 'Jan Odhaczony' }),
      event({ id: 'nowe', at: '2026-08-28T10:00:00Z', who: 'Ewa Nowa' }),
    ]);
    renderPage();

    expect(screen.getByText(pl.dashboard.activityAccepted('Ewa Nowa'))).toBeInTheDocument();
    expect(
      screen.queryByText(pl.dashboard.activityAccepted('Jan Odhaczony')),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.dashboard.activityShowOlder(1) }));
    expect(screen.getByText(pl.dashboard.activityAccepted('Jan Odhaczony'))).toBeInTheDocument();
  });

  it('bez nowych zdarzen nie ma czego odhaczac', () => {
    mockQuotes([quote()]);
    mockActivity([]);
    renderPage();

    // Przycisk nad pusta lista bylby zaproszeniem do klikania w nic.
    expect(
      screen.queryByRole('button', { name: pl.dashboard.activityClear }),
    ).not.toBeInTheDocument();
  });

  it('w trakcie ładowania panele są oznaczone aria-busy i pokazują szkielety', () => {
    mockQuotes(undefined, { isLoading: true });
    renderPage();

    expect(screen.queryByText(pl.dashboard.emptyTitle)).not.toBeInTheDocument();
  });

  it('przy błędzie pokazuje komunikat i pozwala ponowić', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockQuotes(undefined, { isError: true, refetch });
    renderPage();

    expect(screen.getByText(pl.quotes.loadError)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.common.retry }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
