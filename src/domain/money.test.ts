import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney, roundCents } from './money';

/** ICU wstawia spacje twarde/wąskie — porównujemy po normalizacji. */
const norm = (value: string): string => value.replace(/[\s\u00A0\u202F]/g, ' ');

describe('roundCents', () => {
  it('zaokrągla w górę od połowy grosza', () => {
    expect(roundCents(10.4)).toBe(10);
    expect(roundCents(10.5)).toBe(11);
    expect(roundCents(10.6)).toBe(11);
  });

  it('jest symetryczne dla wartości ujemnych (half away from zero)', () => {
    expect(roundCents(-10.4)).toBe(-10);
    expect(roundCents(-10.5)).toBe(-11);
  });

  it('zwraca 0 dla wartości nieskończonych i NaN', () => {
    expect(roundCents(Number.NaN)).toBe(0);
    expect(roundCents(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('nie zmienia liczb całkowitych', () => {
    expect(roundCents(0)).toBe(0);
    expect(roundCents(12345)).toBe(12345);
  });
});

describe('formatMoney', () => {
  it('formatuje grosze w polskiej notacji z domyślną walutą PLN', () => {
    expect(norm(formatMoney(120050))).toBe('1200,50 zł');
    expect(norm(formatMoney(0))).toBe('0,00 zł');
    expect(norm(formatMoney(-35000))).toBe('-350,00 zł');
  });

  it('grupuje tysiące zgodnie z locale pl-PL (od 5 cyfr)', () => {
    expect(norm(formatMoney(1234567))).toBe('12 345,67 zł');
  });

  it('obsługuje inną walutę', () => {
    expect(norm(formatMoney(199900, 'EUR'))).toContain('€');
  });

  it('zaokrągla ułamkowe grosze przed formatowaniem', () => {
    expect(norm(formatMoney(1250.5))).toBe('12,51 zł');
  });
});

describe('parseMoney — poprawne formaty PL', () => {
  const cases: Array<[string, number]> = [
    ['1 200', 120000],
    ['1200,50', 120050],
    ['1200.5', 120050],
    ['1 200,50 zł', 120050],
    ['-350', -35000],
    [' 12 ', 1200],
    ['1\u00A0200,50', 120050],
    ['1\u202F200', 120000],
    ['1\u202F200,50 PLN', 120050],
    ['0', 0],
    ['0,01', 1],
    ['+15', 1500],
    [',5', 50],
    ['1.234.567,89', 123456789],
    ['1,234,567', 123456700],
    ['1.200', 120000],
    ['12,345', 1234500],
    ['-1 000,99zł', -100099],
  ];

  it.each(cases)('parseMoney(%j) === %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it('zaokrągla trzecią cyfrę po przecinku', () => {
    expect(parseMoney('1200,505')).toBe(120051);
    expect(parseMoney('1200,504')).toBe(120050);
    expect(parseMoney('1200,999')).toBe(120100);
  });
});

describe('parseMoney — wejście niepoprawne', () => {
  const garbage = ['', '   ', '\u00A0', 'abc', '12abc', 'zł', '--5', '1e3', '.', ',', 'NaN', '1/2'];

  it.each(garbage)('parseMoney(%j) === null', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});
