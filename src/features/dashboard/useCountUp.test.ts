import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function useFrameClock() {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
}

describe('useCountUp', () => {
  afterEach(() => {
    vi.useRealTimers();
    mockMatchMedia(false);
  });

  it('startuje od zera i dojeżdża dokładnie do wartości końcowej', () => {
    mockMatchMedia(false);
    useFrameClock();

    const { result } = renderHook(() => useCountUp(1000, { durationMs: 200 }));
    expect(result.current).toBe(0);

    // Kilka klatek: liczba jest w drodze — pomiędzy zerem a celem.
    act(() => {
      vi.advanceTimersByTime(48);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(1000);

    // Po upływie czasu animacji liczba osiada DOKŁADNIE na wartości.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(1000);
  });

  it('rośnie monotonicznie (ease-out, bez przestrzału)', () => {
    mockMatchMedia(false);
    useFrameClock();

    const { result } = renderHook(() => useCountUp(500, { durationMs: 160 }));
    let previous = result.current;

    for (let frame = 0; frame < 12; frame++) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
      expect(result.current).toBeGreaterThanOrEqual(previous);
      expect(result.current).toBeLessThanOrEqual(500);
      previous = result.current;
    }
  });

  it('przy prefers-reduced-motion od razu zwraca wartość końcową', () => {
    mockMatchMedia(true);
    useFrameClock();

    const { result } = renderHook(() => useCountUp(750));
    expect(result.current).toBe(750);

    // Żadna klatka niczego nie zmienia — nie ma animacji do odegrania.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(750);
  });

  it('po osiadnięciu zmiana wartości (refetch) podmienia liczbę bez animacji', () => {
    mockMatchMedia(false);
    useFrameClock();

    const { result, rerender } = renderHook(({ value }) => useCountUp(value, { durationMs: 100 }), {
      initialProps: { value: 100 },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe(100);

    // Nowa wartość bez przesuwania zegara — musi pojawić się natychmiast.
    rerender({ value: 250 });
    expect(result.current).toBe(250);
  });
});
