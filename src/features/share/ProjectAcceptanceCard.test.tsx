import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { pl } from '@/i18n/pl';
import type { Acceptance, QuoteComment } from '@/domain/share/schema';

const useQuotesList = vi.fn();
const useQuoteAcceptance = vi.fn();
const useQuoteComments = vi.fn();

vi.mock('@/data/queries/useQuotes', () => ({
  useQuotesList: (...args: unknown[]) => useQuotesList(...args) as unknown,
}));

vi.mock('@/data/queries/useShares', () => ({
  useQuoteAcceptance: (...args: unknown[]) => useQuoteAcceptance(...args) as unknown,
  useQuoteComments: (...args: unknown[]) => useQuoteComments(...args) as unknown,
}));

const { ProjectAcceptanceCard } = await import('./ProjectAcceptanceCard');

function acceptance(partial: Partial<Acceptance> = {}): Acceptance {
  return {
    id: 'a1',
    quoteId: 'q1',
    shareId: 's1',
    acceptedBody: null,
    enabledItemIds: [],
    signerName: 'Anna Kowalska',
    signerIp: null,
    acceptedAt: '2026-08-27T09:30:00Z',
    ...partial,
  };
}

function comment(partial: Partial<QuoteComment> = {}): QuoteComment {
  return {
    id: 'c1',
    quoteId: 'q1',
    shareId: 's1',
    authorName: 'Michał',
    message: 'Prosimy o wariant bez wizualizacji.',
    createdAt: '2026-08-27T10:00:00Z',
    readAt: null,
    ...partial,
  };
}

const acceptedQuote = {
  id: 'q1',
  number: 'WYC/2026/08/0012',
  title: 'Dom 164 m²',
};

function renderCard() {
  render(
    <MemoryRouter>
      <ProjectAcceptanceCard projectId="p1" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useQuotesList.mockReturnValue({ data: [acceptedQuote] });
  useQuoteAcceptance.mockReturnValue({ data: acceptance() });
  useQuoteComments.mockReturnValue({ data: [] });
});

describe('ProjectAcceptanceCard', () => {
  it('pokazuje KTO i KIEDY przyjal oferte', () => {
    renderCard();

    expect(screen.getByText(pl.share.acceptedTitle)).toBeInTheDocument();
    expect(screen.getByText(/Anna Kowalska/)).toBeInTheDocument();
    expect(screen.getByText(/WYC\/2026\/08\/0012/)).toBeInTheDocument();
  });

  it('prowadzi do wyceny, ktorej dotyczy', () => {
    renderCard();

    expect(screen.getByRole('link', { name: pl.share.openQuote })).toHaveAttribute(
      'href',
      '/wyceny/q1',
    );
  });

  /**
   * Status `accepted` da sie ustawic recznie z listy wycen. To poprawny stan,
   * ale NIE znaczy „klient podpisal" — i karta nie ma prawa tego sugerowac.
   * Dowodem jest wpis akceptacji, nie sam status.
   */
  it('MILCZY, gdy wycene oznaczono recznie — bez wpisu akceptacji', () => {
    useQuoteAcceptance.mockReturnValue({ data: null });
    renderCard();

    expect(screen.queryByText(pl.share.acceptedTitle)).not.toBeInTheDocument();
  });

  it('milczy, gdy projekt nie ma zaakceptowanej wyceny', () => {
    useQuotesList.mockReturnValue({ data: [] });
    renderCard();

    expect(screen.queryByText(pl.share.acceptedTitle)).not.toBeInTheDocument();
  });

  it('akceptacja bez podanego imienia nie zostawia dziury w zdaniu', () => {
    useQuoteAcceptance.mockReturnValue({ data: acceptance({ signerName: null }) });
    renderCard();

    expect(screen.getByText(new RegExp(pl.share.acceptedAnonymously))).toBeInTheDocument();
  });

  it('liczy tylko NIEPRZECZYTANE uwagi', () => {
    useQuoteComments.mockReturnValue({
      data: [comment(), comment({ id: 'c2', readAt: '2026-08-27T11:00:00Z' })],
    });
    renderCard();

    expect(screen.getByText(pl.share.unreadComments(1))).toBeInTheDocument();
  });

  it('bez nieprzeczytanych uwag nie pokazuje ich wcale', () => {
    useQuoteComments.mockReturnValue({
      data: [comment({ readAt: '2026-08-27T11:00:00Z' })],
    });
    renderCard();

    expect(screen.queryByText(/uwag/i)).not.toBeInTheDocument();
  });
});
