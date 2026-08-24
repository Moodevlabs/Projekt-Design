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
    city: null,
    internalNotes: null,
    docKind: 'offer' as const,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
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

  it('zapisuje przypisanie do klienta razem z dokumentem', async () => {
    vi.mocked(saveQuote).mockResolvedValue(makeQuote());
    renderHook(() => useAutosave(), { wrapper });

    // Klient siedzi w KOLUMNIE, nie w `body` — bez osobnego sledzenia
    // przypiecie klienta o danych identycznych z naglowkiem nie ruszyloby
    // dokumentu i autozapis nigdy by nie wystartowal.
    act(() => useEditorStore.getState().setClient('c1'));

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveQuote).mock.calls[0]?.[0]).toMatchObject({ clientId: 'c1' });
  });

  it('zapis wyceny bez klienta wysyla `null`, a nie pomija pola', async () => {
    vi.mocked(saveQuote).mockResolvedValue(makeQuote());
    renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Nowa' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
    });

    expect(vi.mocked(saveQuote).mock.calls[0]?.[0]).toMatchObject({ clientId: null });
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

/**
 * Debounce zostawial okno 800 ms, w ktorym zmiana istniala wylacznie w pamieci.
 * Wyjscie z edytora kasowalo timer i nie zapisywalo niczego — praca przepadala
 * bez sladu, a najczestszy scenariusz to „poprawiam cene i klikam Wyceny".
 */
describe('useAutosave — wyjscie z edytora', () => {
  it('zapisuje zmiane zrobiona tuz przed wyjsciem', async () => {
    vi.mocked(saveQuote).mockResolvedValue(makeQuote());
    const { unmount } = renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Tuz przed wyjsciem' }));
    // Uzytkownik wychodzi przed uplywem debounce'a.
    act(() => void vi.advanceTimersByTime(300));

    await act(async () => {
      unmount();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveQuote).toHaveBeenCalledTimes(1);
    const zapisane = vi.mocked(saveQuote).mock.calls[0]?.[0] as {
      body: { sections: { items: { name: string }[] }[] };
    };
    expect(zapisane.body.sections[0]?.items[0]?.name).toBe('Tuz przed wyjsciem');
  });

  it('wyjscie bez zmian nie generuje zapisu', async () => {
    vi.mocked(saveQuote).mockResolvedValue(makeQuote());
    const { unmount } = renderHook(() => useAutosave(), { wrapper });

    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    expect(saveQuote).not.toHaveBeenCalled();
  });

  it('po konflikcie wyjscie tez nie zapisuje', async () => {
    vi.mocked(saveQuote).mockRejectedValue(new ConflictError());
    const { unmount } = renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Nowa' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useEditorStore.getState().saveState).toBe('conflict');

    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    // Wciaz jeden — ten z konfliktu. Wyjscie nie probuje nadpisac cudzych zmian.
    expect(saveQuote).toHaveBeenCalledTimes(1);
  });

  it('zapis wracajacy po wyjsciu nie rusza wyceny, ktora jest juz w edytorze', async () => {
    let resolveSave: ((quote: Quote) => void) | undefined;
    vi.mocked(saveQuote).mockReturnValue(
      new Promise<Quote>((resolve) => {
        resolveSave = resolve;
      }),
    );
    const { unmount } = renderHook(() => useAutosave(), { wrapper });

    act(() => useEditorStore.getState().updateItem(firstItemId(), { name: 'Stara wycena' }));
    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY_MS);
      await Promise.resolve();
    });

    // Wyjscie i otwarcie INNEJ wyceny, zanim tamten zapis wrocil.
    unmount();
    act(() => {
      useEditorStore.getState().reset();
      useEditorStore.getState().load({ ...makeQuote(), id: 'q2' });
    });

    await act(async () => {
      resolveSave?.({ ...makeQuote(), updatedAt: '2026-08-01T12:00:00Z' });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Gdyby `markSaved` poszlo na slepo, nowa wycena dostalaby `updated_at`
    // starej — i nastepny jej zapis wywalilby sie konfliktem.
    expect(useEditorStore.getState().quoteId).toBe('q2');
    expect(useEditorStore.getState().lastSeenUpdatedAt).toBe('2026-08-01T10:00:00Z');
  });
});
