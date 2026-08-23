import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { pl } from '@/i18n/pl';

const useQuotesList = vi.hoisted(() => vi.fn());
const mutationStub = vi.hoisted(() => () => ({ mutate: vi.fn(), isPending: false }));

const useQuoteCities = vi.hoisted(() => vi.fn(() => ({ data: [] as string[] })));
const useQuoteRegisterExport = vi.hoisted(() =>
  vi.fn(() => ({
    mutateAsync: vi.fn(() => Promise.resolve([])),
    isPending: false,
  })),
);

vi.mock('@/data/queries/useQuotes', () => ({
  useQuotesList,
  useQuoteCities,
  useQuoteRegisterExport,
  useSetQuoteRegisterFields: mutationStub,
  useDuplicateQuote: mutationStub,
  useArchiveQuote: mutationStub,
}));

const { QuotesListPage } = await import('./QuotesListPage');

function summary(partial: Partial<QuoteSummary> = {}): QuoteSummary {
  return {
    id: 'q1',
    workspaceId: 'ws',
    number: 'WYC/2026/08/0001',
    title: 'Remont kuchni',
    status: 'draft',
    totalNetCents: 450_000,
    totalGrossCents: 553_500,
    currency: 'PLN',
    clientName: 'Anna Kowalska',
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    ...partial,
  };
}

function mockResult(rows: QuoteSummary[], overrides: Record<string, unknown> = {}) {
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
      <QuotesListPage />
    </MemoryRouter>,
  );
}

/** Ostatnie filtry, z jakimi komponent zawolal hooka. */
function lastFilters(): Record<string, unknown> {
  const calls = useQuotesList.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

describe('QuotesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pokazuje wiersze z numerem, klientem, statusem i kwota', () => {
    mockResult([summary()]);
    renderPage();

    expect(screen.getByText('WYC/2026/08/0001')).toBeInTheDocument();
    expect(screen.getByText('Remont kuchni')).toBeInTheDocument();
    expect(screen.getByText('Anna Kowalska')).toBeInTheDocument();
    expect(screen.getByText(pl.status.draft, { selector: 'span' })).toBeInTheDocument();
    // Naglowek kolumny to "Status", a nie nazwa jednego ze statusow.
    expect(screen.getByRole('columnheader', { name: pl.quotes.statusColumn })).toBeInTheDocument();
    // 450 000 gr = 4500 zl netto.
    expect(screen.getByText(/4\s?500,00/)).toBeInTheDocument();
  });

  it('przekazuje filtr statusu do zapytania, a nie filtruje w przegladarce', async () => {
    const user = userEvent.setup();
    mockResult([summary()]);
    renderPage();

    expect(lastFilters().status).toBe('all');
    await user.click(screen.getByRole('button', { name: pl.status.sent }));
    expect(lastFilters().status).toBe('sent');
  });

  it('przekazuje fraze wyszukiwania do zapytania', async () => {
    const user = userEvent.setup();
    mockResult([summary()]);
    renderPage();

    await user.type(screen.getByLabelText(pl.quotes.searchPlaceholder), 'kuchnia');
    expect(lastFilters().search).toBe('kuchnia');
  });

  it('nie wysyla pustej frazy jako filtra', async () => {
    const user = userEvent.setup();
    mockResult([summary()]);
    renderPage();

    await user.type(screen.getByLabelText(pl.quotes.searchPlaceholder), '   ');
    expect(lastFilters().search).toBeUndefined();
  });

  it('rozroznia pusta biblioteke od pustego wyniku filtrowania', async () => {
    const user = userEvent.setup();
    mockResult([]);
    const { rerender } = renderPage();

    // Bez filtrow: zachecamy do stworzenia pierwszej wyceny.
    expect(screen.getByText(pl.quotes.emptyTitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.status.accepted }));
    rerender(
      <MemoryRouter>
        <QuotesListPage />
      </MemoryRouter>,
    );

    // Z filtrem: to nie jest pusta aplikacja, tylko pusty wynik.
    expect(screen.getByText(pl.quotes.noResultsTitle)).toBeInTheDocument();
  });

  it('daje kazdemu wierszowi menu akcji', () => {
    mockResult([summary({ id: 'a', title: 'Pierwsza' }), summary({ id: 'b', title: 'Druga' })]);
    renderPage();

    expect(
      screen.getByRole('button', { name: `${pl.quotes.rowActions}: Pierwsza` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${pl.quotes.rowActions}: Druga` }),
    ).toBeInTheDocument();
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    mockResult([], { isError: true });
    renderPage();

    expect(screen.getByText(new RegExp(pl.quotes.loadError))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});
