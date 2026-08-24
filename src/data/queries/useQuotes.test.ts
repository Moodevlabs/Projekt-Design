/**
 * Sedno T-06: optimistic update przy zmianie statusu wyceny.
 * Sprawdzamy, że cache dostaje nowy status ZANIM mutacja się rozwiąże
 * i że wraca do poprzedniego, gdy zapis zostanie odrzucony.
 */
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '@/data/query-keys';
import { setQuoteStatus, type Quote, type QuoteSummary } from '@/data/repos/quotes.repo';
import { newQuoteBody } from '@/domain/quote';
import { useSetQuoteStatus } from './useQuotes';

vi.mock('@/data/repos/quotes.repo', () => ({
  listQuotes: vi.fn(),
  getQuote: vi.fn(),
  createQuote: vi.fn(),
  saveQuote: vi.fn(),
  setQuoteStatus: vi.fn(),
  duplicateQuote: vi.fn(),
  archiveQuote: vi.fn(),
}));

const QUOTE_ID = '11111111-1111-4111-8111-111111111111';
const LIST_KEY = queryKeys.quotes({ workspaceId: 'ws-1' });

function makeSummary(): QuoteSummary {
  return {
    id: QUOTE_ID,
    workspaceId: 'ws-1',
    clientId: null,
    projectId: null,
    number: 'WYC/2026/08/0001',
    title: 'Wycena testowa',
    status: 'draft',
    totalNetCents: 100_000,
    totalGrossCents: 123_000,
    currency: 'PLN',
    clientName: 'Klient',
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  };
}

function makeQuote(): Quote {
  return {
    ...makeSummary(),
    clientId: null,
    body: newQuoteBody(),
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

/** Klient bez retry — inaczej odrzucona mutacja próbowałaby jeszcze raz. */
function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => {
  vi.mocked(setQuoteStatus).mockReset();
});

describe('useSetQuoteStatus — optimistic update', () => {
  it('podmienia status na liście i w detalu, zanim mutacja się rozwiąże', async () => {
    const client = makeClient();
    client.setQueryData<QuoteSummary[]>(LIST_KEY, [makeSummary()]);
    client.setQueryData<Quote>(queryKeys.quote(QUOTE_ID), makeQuote());

    // Mutacja, która nigdy się nie kończy — zatrzymujemy się w trakcie „lotu".
    vi.mocked(setQuoteStatus).mockImplementation(() => new Promise<QuoteSummary>(() => undefined));

    const { result } = renderHook(() => useSetQuoteStatus(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ id: QUOTE_ID, status: 'sent' });
    });

    await waitFor(() => {
      expect(client.getQueryData<QuoteSummary[]>(LIST_KEY)?.[0]?.status).toBe('sent');
    });
    expect(client.getQueryData<Quote>(queryKeys.quote(QUOTE_ID))?.status).toBe('sent');
    // Nowy status jest w cache, choć serwer jeszcze nie odpowiedział.
    expect(result.current.isPending).toBe(true);
  });

  it('cofa listę i detal do snapshotu, gdy zapis zostanie odrzucony', async () => {
    const client = makeClient();
    client.setQueryData<QuoteSummary[]>(LIST_KEY, [makeSummary()]);
    client.setQueryData<Quote>(queryKeys.quote(QUOTE_ID), makeQuote());

    let rejectMutation: (error: Error) => void = () => undefined;
    vi.mocked(setQuoteStatus).mockImplementation(
      () =>
        new Promise<QuoteSummary>((_resolve, reject) => {
          rejectMutation = reject;
        }),
    );

    const { result } = renderHook(() => useSetQuoteStatus(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ id: QUOTE_ID, status: 'accepted' });
    });

    await waitFor(() => {
      expect(client.getQueryData<QuoteSummary[]>(LIST_KEY)?.[0]?.status).toBe('accepted');
    });

    act(() => {
      rejectMutation(new Error('Tryb tylko do odczytu'));
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryData<QuoteSummary[]>(LIST_KEY)?.[0]?.status).toBe('draft');
    expect(client.getQueryData<Quote>(queryKeys.quote(QUOTE_ID))?.status).toBe('draft');
  });

  it('zostawia w cache wynik z serwera, gdy zapis się powiedzie', async () => {
    const client = makeClient();
    client.setQueryData<QuoteSummary[]>(LIST_KEY, [makeSummary()]);

    vi.mocked(setQuoteStatus).mockResolvedValue({
      ...makeSummary(),
      status: 'sent',
      sentAt: '2026-08-22T09:00:00Z',
    });

    const { result } = renderHook(() => useSetQuoteStatus(), { wrapper: makeWrapper(client) });

    act(() => {
      result.current.mutate({ id: QUOTE_ID, status: 'sent' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData<QuoteSummary[]>(LIST_KEY)?.[0]?.status).toBe('sent');
  });
});
