import { describe, expect, it } from 'vitest';
import { trialTone } from './trial-tone';

/** Jasność postrzegana — do sprawdzania, że barwa faktycznie się przesuwa. */
function redness(hex: string): number {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  return r - g;
}

describe('trialTone', () => {
  it('pełny zapas dni to oliwka', () => {
    expect(trialTone(14, 14)).toBe('#4a6340');
  });

  it('ostatni dzień to terakota', () => {
    expect(trialTone(0, 14)).toBe('#a8402f');
  });

  it('połowa zapasu to ochra', () => {
    expect(trialTone(7, 14)).toBe('#b07d2c');
  });

  it('im mniej dni, tym cieplejsza barwa', () => {
    const kolejno = [14, 12, 10, 7, 5, 3, 1, 0].map((d) => redness(trialTone(d, 14)));
    for (let i = 1; i < kolejno.length; i++) {
      expect(kolejno[i]!).toBeGreaterThan(kolejno[i - 1]!);
    }
  });

  it('przycina wartości spoza zakresu zamiast zwracać śmieci', () => {
    expect(trialTone(99, 14)).toBe(trialTone(14, 14));
    expect(trialTone(-5, 14)).toBe(trialTone(0, 14));
  });

  it('zerowy okres próbny nie dzieli przez zero', () => {
    expect(trialTone(0, 0)).toBe('#a8402f');
  });

  it('zawsze zwraca poprawny zapis szesnastkowy', () => {
    for (let d = 0; d <= 14; d++) {
      expect(trialTone(d, 14)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
