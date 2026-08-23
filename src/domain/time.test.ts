import { describe, expect, it } from 'vitest';
import { formatMinutes } from './time';

describe('formatMinutes', () => {
  it.each([
    [0, '0 min'],
    [1, '1 min'],
    [45, '45 min'],
    [59, '59 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [1100, '18 h 20 min'],
    [1440, '24 h'],
  ])('%i min → %s', (minuty, oczekiwane) => {
    expect(formatMinutes(minuty)).toBe(oczekiwane);
  });

  it('pełne godziny idą bez „0 min”', () => {
    // Dopisek nic nie wnosi, a wydłuża liczbę, która ma być czytana jednym
    // rzutem oka.
    expect(formatMinutes(120)).toBe('2 h');
  });

  it('zero to „0 min”, a nie pusty tekst', () => {
    // Brak wartości i zero to dwie różne informacje.
    expect(formatMinutes(0)).toBe('0 min');
  });

  it('wartości ujemne i ułamkowe nie psują wyniku', () => {
    expect(formatMinutes(-30)).toBe('0 min');
    expect(formatMinutes(90.4)).toBe('1 h 30 min');
  });
});
