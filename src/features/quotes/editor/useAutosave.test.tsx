import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';
import { useEditorStore } from './editor.store';
import { ConflictError } from '@/data/repos/errors';
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
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    body: structuredClone(BODY),
    bodyError: null,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

function firstItemId(): string {
  const id = useEditorStore.getState().body?.sections[0]?.items[0]?.id;
  if (!id) throw new Error('brak pozycji');
  return id;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  useEditorStore.getState().reset();
  useEditorStore.getState().load(makeQuote());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('nie zapisuje samo z siebie po wczytaniu wyceny', () => {
    renderHook(() => useAutosave(), { wrapper });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 3));
    expect(saveQuote).not.toHaveBeenCalled();
  });

  it('zapisuje po ciszy dluzszej niz debounce', async () => {
    vi.mocked(saveQuote).mockResolvedValue({
      ...makeQuote(),
      updatedAt: '2026-08-01T11:00:00Z',
    });
    renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Nowa' }));
    expect(saveQuote).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
    expect(useEditorStore.getState().lastSeenUpdatedAt).toBe('2026-08-01T11:00:00Z');
  });

  it('kazda kolejna zmiana resetuje debounce — zapis leci po OSTATNIEJ, nie po pierwszej', async () => {
    vi.mocked(saveQuote).mockResolvedValue(makeQuote());
    renderHook(() => useAutosave(), { wrapper });

    const id = firstItemId();
    act(() => useEditorStore.getState().updateItem(id, { name: 'a' }));
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100));
    act(() => useEditorStore.getState().updateItem(id, { name: 'ab' }));
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100));
    act(() => useEditorStore.getState().updateItem(id, { name: 'abc' }));

    // Lacznie minelo wiecej niz 800 ms, ale nigdy nie bylo 800 ms ciszy.
    expect(saveQuote).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
    });
    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('przelaczenie trybu podgladu nie wywoluje zapisu', () => {
    renderHook(() => useAutosave(), { wrapper });
    act(() => useEditorStore.getState().setMode('preview'));
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2));
    expect(saveQuote).not.toHaveBeenCalled();
  });

  it('po konflikcie przestaje zapisywac — ponowienie nadpisaloby cudze zmiany', async () => {
    vi.mocked(saveQuote).mockRejectedValue(new ConflictError());
    renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Nowa' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useEditorStore.getState().saveState).toBe('conflict');

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Jeszcze nowsza' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2);
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('zwykly blad zapisu zostawia stan `error` z komunikatem', async () => {
    vi.mocked(saveQuote).mockRejectedValue(new Error('brak sieci'));
    renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Nowa' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useEditorStore.getState().saveState).toBe('error');
    expect(useEditorStore.getState().saveError).toBe('brak sieci');
  });
});
