import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { entitlementFor } from '@/domain/billing/entitlement';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';

const useSubscription = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useSubscription', () => ({ useSubscription }));
vi.mock('@/data/repos/quotes.repo', () => ({
  saveQuote: vi.fn(),
  listQuotes: vi.fn(),
  getQuote: vi.fn(),
  createQuote: vi.fn(),
  setQuoteStatus: vi.fn(),
  duplicateQuote: vi.fn(),
  archiveQuote: vi.fn(),
}));

const { useEntitlement } = await import('./useEntitlement');
const { useAutosave, AUTOSAVE_DELAY_MS } = await import('@/features/quotes/editor/useAutosave');
const { useEditorStore } = await import('@/features/quotes/editor/editor.store');
const { saveQuote } = await import('@/data/repos/quotes.repo');

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

/** Odpowiedź zapytania o subskrypcję w jednym z trzech stanów wiedzy. */
function answer(state: 'pending' | 'error' | 'ok', status?: string) {
  useSubscription.mockReturnValue({
    isPending: state === 'pending',
    isError: state === 'error',
    isSuccess: state === 'ok',
    data:
      state === 'ok'
        ? {
            workspaceId: 'ws',
            status,
            plan: null,
            trialEndsAt: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
            stripeCustomerId: null,
          }
        : undefined,
  });
}

function makeQuote(): Quote {
  return {
    id: 'q1',
    workspaceId: 'ws',
    number: 'WYC/2026/08/0001',
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    projectId: null,
    lineageId: 'line-1',
    version: 1,
    body: newQuoteBody({
      title: 'Wycena',
      sections: [newSection({ title: 'Sekcja', items: [newItem({ name: 'Pozycja' })] })],
    }),
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  answer('ok', 'active');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useEntitlement — co znaczy „nie wiem"', () => {
  it.each([
    ['pending', 'zapytanie jeszcze nie wrocilo (albo czeka na workspace)'],
    ['error', 'zapytanie sie wywalilo — brak sieci'],
  ] as const)('%s nie odbiera prawa zapisu (%s)', (state, _opis) => {
    // Regresja: `useSubscription` jest wylaczone, dopoki nie znamy workspace'u.
    // Wylaczone zapytanie NIE jest „isLoading”, wiec sprawdzanie samego
    // `isLoading` dawalo na starcie „brak subskrypcji” i blokowalo edytor
    // kazdemu, lacznie z placacymi.
    answer(state);
    const { result } = renderHook(() => useEntitlement(), { wrapper });

    expect(result.current.canWrite).toBe(true);
    expect(result.current.loading).toBe(true);
  });

  it('dopiero odpowiedz „brak subskrypcji” blokuje', () => {
    useSubscription.mockReturnValue({
      isPending: false,
      isError: false,
      isSuccess: true,
      data: null,
    });
    const { result } = renderHook(() => useEntitlement(), { wrapper });

    expect(result.current.canWrite).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('zgadza sie z domenowa regula dla kazdego statusu', () => {
    // Hook nie ma prawa miec wlasnego zdania — decyduje `entitlementFor`.
    for (const status of ['trialing', 'active', 'past_due', 'canceled', 'unpaid'] as const) {
      answer('ok', status);
      const { result, unmount } = renderHook(() => useEntitlement(), { wrapper });

      const oczekiwane = entitlementFor({
        status,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      expect(result.current.canWrite, status).toBe(oczekiwane.canWrite);
      expect(result.current.reason, status).toBe(oczekiwane.reason);
      unmount();
    }
  });
});

describe('autozapis a wygasly dostep', () => {
  function edytuj() {
    const id = useEditorStore.getState().body?.sections[0]?.items[0]?.id;
    if (!id) throw new Error('brak pozycji');
    act(() => {
      useEditorStore.getState().updateItem(id, { name: 'Zmienione' });
    });
  }

  it('nie wysyla zapisu, gdy dostep wygasl', async () => {
    answer('ok', 'canceled');
    renderHook(() => useAutosave(), { wrapper });
    act(() => {
      useEditorStore.getState().load(makeQuote());
    });

    edytuj();
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
      await Promise.resolve();
    });

    // Kluczowe: RLS odrzuca UPDATE **cicho**, zerem wierszy, a nasz zapis
    // porownuje `updated_at` — wiec nieposlany zapis to jedyny sposob, zeby
    // uzytkownik nie zobaczyl klamstwa „wycena zmieniona w innym miejscu”.
    expect(saveQuote).not.toHaveBeenCalled();
    expect(useEditorStore.getState().saveState).not.toBe('conflict');
  });

  it('wysyla normalnie, gdy dostep jest aktywny', async () => {
    vi.mocked(saveQuote).mockResolvedValue({
      ...makeQuote(),
      updatedAt: '2026-08-01T10:05:00Z',
    });
    answer('ok', 'active');
    renderHook(() => useAutosave(), { wrapper });
    act(() => {
      useEditorStore.getState().load(makeQuote());
    });

    edytuj();
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('nie gubi zapisu tylko dlatego, ze subskrypcji nie udalo sie odczytac', async () => {
    // Brak sieci przy odczycie subskrypcji nie moze zablokowac zapisu wyceny.
    vi.mocked(saveQuote).mockResolvedValue({
      ...makeQuote(),
      updatedAt: '2026-08-01T10:05:00Z',
    });
    answer('error');
    renderHook(() => useAutosave(), { wrapper });
    act(() => {
      useEditorStore.getState().load(makeQuote());
    });

    edytuj();
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS + 10);
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
  });
});
