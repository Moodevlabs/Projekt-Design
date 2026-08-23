import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newQuoteBody } from '@/domain/quote';
import type { QuoteStatus } from '@/domain/quote';

const setStatusMutate = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useQuotes', () => ({
  useSetQuoteStatus: () => ({ mutate: setStatusMutate, isPending: false }),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { useMarkAsSentPrompt } = await import('./useMarkAsSentPrompt');
const { useEditorStore } = await import('./editor.store');

function zaladuj(status: QuoteStatus) {
  useEditorStore.setState({
    body: newQuoteBody({ title: 'Wycena' }),
    quoteId: 'q1',
    status,
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
});

describe('useMarkAsSentPrompt', () => {
  it('pyta po eksporcie, gdy wycena jest szkicem', () => {
    zaladuj('draft');
    const { result } = renderHook(() => useMarkAsSentPrompt());

    act(() => result.current.afterExport());
    expect(result.current.open).toBe(true);
  });

  it.each(['sent', 'accepted', 'rejected'] as const)('NIE pyta o wycene w stanie %s', (status) => {
    // Wycena zaakceptowana albo odrzucona jest juz dalej w swoim zyciu.
    // Cofniecie jej do „wyslanej" niszczyloby informacje, i to bez pytania
    // o zgode akurat na to.
    zaladuj(status);
    const { result } = renderHook(() => useMarkAsSentPrompt());

    act(() => result.current.afterExport());
    expect(result.current.open).toBe(false);
  });

  it('pyta RAZ na sesje edytora, nawet po kilku eksportach', () => {
    // Ktos, kto eksportuje trzy razy pod rzad, bo poprawia literowke, nie ma
    // dostawac tego samego pytania trzy razy.
    zaladuj('draft');
    const { result } = renderHook(() => useMarkAsSentPrompt());

    act(() => result.current.afterExport());
    act(() => result.current.setOpen(false));
    act(() => result.current.afterExport());

    expect(result.current.open).toBe(false);
  });

  it('potwierdzenie zmienia status i zamyka pytanie', () => {
    zaladuj('draft');
    const { result } = renderHook(() => useMarkAsSentPrompt());

    act(() => result.current.afterExport());
    act(() => result.current.confirm());

    expect(result.current.open).toBe(false);
    expect(setStatusMutate).toHaveBeenCalledTimes(1);
    const [vars] = setStatusMutate.mock.calls[0] as [{ id: string; status: string }];
    expect(vars).toEqual({ id: 'q1', status: 'sent' });
  });

  it('po udanym zapisie przestawia status w store', () => {
    // Store trzyma status niezaleznie od cache zapytan — bez tego pasek
    // edytora pokazywalby dalej „szkic" az do przeladowania strony.
    setStatusMutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.(),
    );
    zaladuj('draft');
    const { result } = renderHook(() => useMarkAsSentPrompt());

    act(() => result.current.afterExport());
    act(() => result.current.confirm());

    expect(useEditorStore.getState().status).toBe('sent');
  });

  it('bez otwartej wyceny nie wysyla niczego', () => {
    const { result } = renderHook(() => useMarkAsSentPrompt());
    act(() => result.current.confirm());
    expect(setStatusMutate).not.toHaveBeenCalled();
  });
});
