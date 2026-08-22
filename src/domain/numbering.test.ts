import { describe, expect, it } from 'vitest';
import { DEFAULT_NUMBER_PATTERN, generateQuoteNumber } from './numbering';

const date = new Date(2026, 7, 22); // 22 sierpnia 2026 (czas lokalny, jak to_char(now()))

describe('generateQuoteNumber', () => {
  it('używa domyślnego wzorca zgodnego z SQL next_quote_number', () => {
    expect(DEFAULT_NUMBER_PATTERN).toBe('WYC/{YYYY}/{MM}/{seq}');
    expect(generateQuoteNumber(DEFAULT_NUMBER_PATTERN, 12, date)).toBe('WYC/2026/08/0012');
  });

  it('dopełnia licznik do 4 cyfr', () => {
    expect(generateQuoteNumber('{seq}', 1, date)).toBe('0001');
    expect(generateQuoteNumber('{seq}', 999, date)).toBe('0999');
  });

  it('nie ucina licznika dłuższego niż padding', () => {
    expect(generateQuoteNumber('{seq}', 123456, date)).toBe('123456');
  });

  it('obsługuje własny padding {seq:N}', () => {
    expect(generateQuoteNumber('{seq:6}', 7, date)).toBe('000007');
    expect(generateQuoteNumber('{seq:1}', 7, date)).toBe('7');
  });

  it('wraca do domyślnego paddingu przy {seq:0}', () => {
    expect(generateQuoteNumber('{seq:0}', 7, date)).toBe('0007');
  });

  it('obsługuje tokeny daty', () => {
    expect(generateQuoteNumber('{YYYY}-{YY}-{MM}-{DD}', 1, date)).toBe('2026-26-08-22');
  });

  it('dopełnia miesiąc i dzień zerami', () => {
    expect(generateQuoteNumber('{MM}/{DD}', 1, new Date(2026, 0, 5))).toBe('01/05');
  });

  it('pozostawia nieznane tokeny bez zmian', () => {
    expect(generateQuoteNumber('OF/{XYZ}/{seq}', 3, date)).toBe('OF/{XYZ}/0003');
  });

  it('używa daty bieżącej, gdy nie podano', () => {
    expect(generateQuoteNumber('{YYYY}', 1)).toBe(String(new Date().getFullYear()));
  });

  it('wraca do domyślnego wzorca przy pustym wejściu', () => {
    expect(generateQuoteNumber('', 12, date)).toBe('WYC/2026/08/0012');
    expect(generateQuoteNumber('   ', 12, date)).toBe('WYC/2026/08/0012');
  });

  it('normalizuje licznik ujemny i ułamkowy', () => {
    expect(generateQuoteNumber('{seq}', -5, date)).toBe('0000');
    expect(generateQuoteNumber('{seq}', 12.9, date)).toBe('0012');
  });
});
