import { describe, expect, it } from 'vitest';
import { toCsv, UTF8_BOM } from './csv';

describe('toCsv — plik ma się otworzyć w Excelu (kryterium T-49)', () => {
  it('zaczyna się od BOM-u UTF-8', () => {
    // Bez niego Excel zgaduje strone kodowa i „Krakow" robi sie „KrakÃ³w".
    expect(toCsv(['A'], [['Kraków']]).startsWith(UTF8_BOM)).toBe(true);
  });

  it('rozdziela kolumny średnikiem, nie przecinkiem', () => {
    // Excel w PL czyta przecinek jako separator dziesietny.
    expect(toCsv(['A', 'B'], [['1', '2']])).toContain('1;2');
  });

  it('kończy wiersze CRLF-em', () => {
    expect(toCsv(['A'], [['x']])).toBe(`${UTF8_BOM}A\r\nx\r\n`);
  });
});

describe('toCsv — escapowanie', () => {
  it('cytuje pole ze średnikiem', () => {
    expect(toCsv(['A'], [['Kraków; Nowa Huta']])).toContain('"Kraków; Nowa Huta"');
  });

  it('podwaja cudzysłowy w środku', () => {
    expect(toCsv(['A'], [['mówi "tak"']])).toContain('"mówi ""tak"""');
  });

  it('cytuje notatkę wielolinijkową, zamiast rozsypać plik', () => {
    const csv = toCsv(['NOTATKI'], [['pierwsza\ndruga']]);
    expect(csv).toContain('"pierwsza\ndruga"');
    // Naglowek, jeden wiersz danych i koncowy CRLF — nie dwa wiersze danych.
    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('puste i brakujące wartości dają pustą komórkę', () => {
    expect(toCsv(['A', 'B', 'C'], [[null, undefined, '']])).toContain(';;');
  });

  it('liczby zapisuje bez zmian', () => {
    expect(toCsv(['LP'], [[1]])).toContain('1');
  });
});

describe('toCsv — komórka nie może się wykonać', () => {
  it('neutralizuje wiodący znak formuły', () => {
    /*
     * Notatka zaczynajaca sie od `=` albo `+` jest dla Excela formula.
     * `=HYPERLINK(...)` w cudzym arkuszu to nie zart, tylko CSV injection.
     */
    for (const znak of ['=', '+', '-', '@']) {
      expect(toCsv(['NOTATKI'], [[`${znak}HYPERLINK("http://x")`]])).toContain(`'${znak}`);
    }
  });

  it('nie rusza znaku, który nie stoi na początku', () => {
    expect(toCsv(['A'], [['1+1']])).toContain('1+1');
  });
});
