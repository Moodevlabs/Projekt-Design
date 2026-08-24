import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';
import { useEditorStore } from './editor.store';
import { saveQuote } from '@/data/repos/quotes.repo';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';

vi.mock('@/data/repos/quotes.repo', () => ({
  saveQuote: vi.fn(),
  listQuotes: vi.fn(),
  getQuote: vi.fn(),
  createQuote: vi.fn(),
  setQuoteStatus: vi.fn(),
  duplicateQuote: vi.fn(),
  archiveQuote: vi.fn(),
}));

const runningInTauri = vi.hoisted(() => vi.fn());
const onWindowCloseRequested = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tauri', () => ({ runningInTauri, onWindowCloseRequested }));

const BODY = newQuoteBody({
  title: 'Wycena',
  sections: [newSection({ title: 'Sekcja', items: [newItem({ name: 'Pozycja' })] })],
});

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
    body: structuredClone(BODY),
    bodyError: null,
    schedule: null,
    documents: null,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function dirty() {
  const id = useEditorStore.getState().body?.sections[0]?.items[0]?.id;
  if (!id) throw new Error('brak pozycji');
  act(() => useEditorStore.getState().updateItem(id, { name: 'Niezapisana zmiana' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  useEditorStore.getState().reset();
  useEditorStore.getState().load(makeQuote());
  vi.mocked(saveQuote).mockResolvedValue(makeQuote());
});

afterEach(() => vi.useRealTimers());

/**
 * Zamkniecie okna to druga polowa tej samej dziury co wyjscie z edytora:
 * niezapisana zmiana ginela razem z procesem.
 */
describe('useAutosave — zamkniecie okna w Tauri', () => {
  beforeEach(() => {
    runningInTauri.mockReturnValue(true);
    onWindowCloseRequested.mockResolvedValue(vi.fn());
  });

  it('wstrzymuje zamkniecie i zapisuje oczekujaca zmiane', async () => {
    renderHook(() => useAutosave(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    dirty();

    // Tauri woła nasz handler zamiast od razu zamykac okno.
    const beforeClose = onWindowCloseRequested.mock.calls[0]?.[0] as () => Promise<void>;
    expect(beforeClose).toBeTypeOf('function');

    await act(async () => {
      await beforeClose();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('bez niezapisanych zmian zamkniecie niczego nie wysyla', async () => {
    renderHook(() => useAutosave(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    const beforeClose = onWindowCloseRequested.mock.calls[0]?.[0] as () => Promise<void>;
    await act(async () => {
      await beforeClose();
    });

    expect(saveQuote).not.toHaveBeenCalled();
  });

  it('w Tauri nie wiesza sie na `beforeunload` — okno obsluguje sie inaczej', async () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    renderHook(() => useAutosave(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    expect(addListener).not.toHaveBeenCalledWith('beforeunload', expect.anything());
    addListener.mockRestore();
  });
});

describe('useAutosave — zamkniecie karty w przegladarce (pnpm dev)', () => {
  beforeEach(() => runningInTauri.mockReturnValue(false));

  it('zapisuje i ostrzega, gdy sa niezapisane zmiany', async () => {
    renderHook(() => useAutosave(), { wrapper });
    dirty();

    const event = new Event('beforeunload', { cancelable: true });
    act(() => void window.dispatchEvent(event));

    // `preventDefault` musi paść od razu — to jedyne, co przegladarka czyta
    // synchronicznie, i jedyne, co daje zapisowi czas na wyjscie.
    expect(event.defaultPrevented).toBe(true);

    // Sam zapis rusza mikrotask pozniej (mutacja TanStack Query).
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('bez zmian nie ostrzega — pusty dialog przy kazdym zamknieciu to halas', () => {
    renderHook(() => useAutosave(), { wrapper });

    const event = new Event('beforeunload', { cancelable: true });
    act(() => void window.dispatchEvent(event));

    expect(saveQuote).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('odpina nasluch po odmontowaniu', () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useAutosave(), { wrapper });

    unmount();

    expect(removeListener).toHaveBeenCalledWith('beforeunload', expect.anything());
    removeListener.mockRestore();
  });
});
