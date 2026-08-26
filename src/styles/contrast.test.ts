import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Audyt kontrastu palety (T-82, WCAG 2.1 AA).
 *
 * Test **czyta `globals.css` i parsuje z niego wartości**, zamiast trzymać
 * własną kopię palety. To celowe: kopia zestarzałaby się przy pierwszej
 * zmianie odcienia i test zaczął by pilnować nieistniejącego stanu (dokładnie
 * ten problem ma `schema.test.ts` wobec migracji — patrz notatka przy T-81).
 * Tutaj rozjazd jest niemożliwy: jedyne źródło wartości to plik produkcyjny.
 *
 * Po co to w ogóle: redesign ocieplił całą paletę, a ciepłe barwy przy tej
 * samej „intuicyjnej" jasności mają NIŻSZĄ luminancję względną niż chłodne.
 * Pięć par wpadło poniżej progu dopiero po przeliczeniu — w tym terakota
 * rabatów (4,25:1), która niesie kwoty, i tor przełącznika (1,44:1), na
 * którym nie było widać pozycji kciuka, czyli jedynego nośnika stanu.
 *
 * Progi: tekst 4,5:1; elementy interfejsu i wskaźnik fokusu 3:1.
 */
const CSS = readFileSync(resolve(import.meta.dirname, './globals.css'), 'utf8');

/** Wartość tokenu z bloku `:root`. Rzuca, gdy token zniknął — to też jest wynik. */
function token(name: string): string {
  const match = CSS.match(new RegExp(`^\\s*--${name}:\\s*([^;]+);`, 'm'));
  if (!match?.[1]) throw new Error(`Brak tokenu --${name} w globals.css`);
  return match[1].trim();
}

function channels(color: string): [number, number, number] {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  if (rgba?.[1]) {
    const parts = rgba[1].split(',').map((p) => Number.parseFloat(p.trim()));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  }
  const hex = color.replace('#', '');
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Krycie z zapisu `rgba(...)`; 1 dla kolorów nieprzezroczystych. */
function alpha(color: string): number {
  const parts = color.match(/rgba\(([^)]+)\)/)?.[1]?.split(',');
  return parts?.length === 4 ? Number.parseFloat(parts[3]!.trim()) : 1;
}

/** Nałożenie półprzezroczystego koloru na tło — inaczej nie da się go zmierzyć. */
function flatten(color: string, background: string): [number, number, number] {
  const a = alpha(color);
  if (a === 1) return channels(color);
  const fg = channels(color);
  const bg = channels(background);
  return fg.map((c, i) => c * a + bg[i]! * (1 - a)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(foreground: string, background: string): number {
  const [hi, lo] = [
    luminance(flatten(foreground, background)),
    luminance(channels(background)),
  ].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const UI = 3;

describe('kontrast palety Toolier', () => {
  /** Cztery podłoża, na których cokolwiek w aplikacji stoi. */
  const grounds = {
    pas: token('beige'),
    kanwa: token('canvas'),
    karta: token('surface'),
    'panel zagnieżdżony': token('surface-2'),
  };

  describe('tekst na jasnych podłożach (4,5:1)', () => {
    for (const [name, ground] of Object.entries(grounds)) {
      it(`--ink na ${name}`, () => {
        expect(contrast(token('ink'), ground)).toBeGreaterThanOrEqual(TEXT);
      });
      it(`--ink-soft na ${name}`, () => {
        expect(contrast(token('ink-soft'), ground)).toBeGreaterThanOrEqual(TEXT);
      });
    }
  });

  describe('tekst na brązowej szynie (4,5:1)', () => {
    it('--rail-ink', () => {
      expect(contrast(token('rail-ink'), token('rail'))).toBeGreaterThanOrEqual(TEXT);
    });

    // Etykiety spoczynkowe nawigacji są półprzezroczyste — mierzone po nałożeniu.
    it('--rail-ink-soft (półprzezroczysty)', () => {
      expect(contrast(token('rail-ink-soft'), token('rail'))).toBeGreaterThanOrEqual(TEXT);
    });

    it('--rail-pill-ink na bloku aktywnej pozycji', () => {
      expect(contrast(token('rail-pill-ink'), token('rail-pill'))).toBeGreaterThanOrEqual(TEXT);
    });

    it('--cta-fg na przycisku CTA', () => {
      expect(contrast(token('cta-fg'), token('cta'))).toBeGreaterThanOrEqual(TEXT);
    });
  });

  describe('barwy funkcyjne jako tekst (4,5:1)', () => {
    it('--danger na karcie', () => {
      expect(contrast(token('danger'), token('surface'))).toBeGreaterThanOrEqual(TEXT);
    });

    it('--danger na własnym tle ostrzeżenia', () => {
      expect(contrast(token('danger'), token('danger-wash'))).toBeGreaterThanOrEqual(TEXT);
    });

    it('--positive na własnym tle potwierdzenia', () => {
      expect(contrast(token('positive'), token('positive-wash'))).toBeGreaterThanOrEqual(TEXT);
    });

    it('--warning na karcie', () => {
      expect(contrast(token('warning'), token('surface'))).toBeGreaterThanOrEqual(TEXT);
    });

    // Rabat to KWOTA, nie ozdoba — obowiązuje próg tekstowy, nie graficzny.
    it('--discount na karcie', () => {
      expect(contrast(token('discount'), token('surface'))).toBeGreaterThanOrEqual(TEXT);
    });
  });

  describe('elementy interfejsu (3:1)', () => {
    // Wskaźnik fokusu to jedyna informacja o pozycji dla osoby na klawiaturze.
    for (const [name, ground] of Object.entries(grounds)) {
      it(`--ring na ${name}`, () => {
        expect(contrast(token('ring'), ground)).toBeGreaterThanOrEqual(UI);
      });
    }

    it('--ink-faint (placeholdery) na karcie', () => {
      expect(contrast(token('ink-faint'), token('surface'))).toBeGreaterThanOrEqual(UI);
    });

    /*
     * Jedno sprawdzenie za dwa: „tor na karcie" i „biały kciuk na torze" to
     * matematycznie ten sam stosunek, bo kciuk jest czystą bielą tak samo jak
     * karta. Dlatego jasny tor przegrywał w obu miejscach naraz.
     */
    it('tor wyłączonego przełącznika — widoczny i na karcie, i pod kciukiem', () => {
      expect(contrast(token('toggle-off'), token('surface'))).toBeGreaterThanOrEqual(UI);
    });

    it('stan włączony przełącznika odróżnia się od wyłączonego', () => {
      expect(contrast(token('cta'), token('toggle-off'))).toBeGreaterThanOrEqual(UI);
    });
  });

  describe('odcinki statusu wyceny jako grafika (3:1)', () => {
    for (const status of ['draft', 'sent', 'accepted', 'rejected', 'expired']) {
      it(`--status-${status} na karcie`, () => {
        expect(contrast(token(`status-${status}`), token('surface'))).toBeGreaterThanOrEqual(UI);
      });
    }
  });
});
