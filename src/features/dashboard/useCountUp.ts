import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export interface CountUpOptions {
  /** Czas dojazdu do wartości w ms. */
  durationMs?: number;
}

/**
 * Liczba, która „osiada" jak przeliczana suma wyceny: startuje od zera
 * i dojeżdża do wartości z wygaszaniem (ease-out cubic) na rAF.
 *
 * Zasady (05-UI / podpis produktu):
 * - animuje TYLKO przy pierwszym pojawieniu się wartości po zamontowaniu —
 *   refetch po osiadnięciu podmienia liczbę natychmiast, bez ponownego dojazdu;
 * - `prefers-reduced-motion: reduce` → od razu wartość końcowa, zero klatek;
 * - zwraca liczbę zmiennoprzecinkową — zaokrągla warstwa prezentacji.
 */
export function useCountUp(target: number, { durationMs = 800 }: CountUpOptions = {}): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  // `true` = liczba już osiadła (albo użytkownik prosi o brak ruchu).
  const settledRef = useRef(prefersReducedMotion());

  useEffect(() => {
    if (settledRef.current) {
      setValue(target);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      // Start liczymy od pierwszej klatki, nie od `performance.now()` w efekcie —
      // dzięki temu hook działa tak samo pod prawdziwym i sztucznym zegarem.
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (progress < 1) {
        setValue(target * eased);
        frame = requestAnimationFrame(tick);
      } else {
        settledRef.current = true;
        setValue(target);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
