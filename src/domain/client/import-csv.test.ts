import { describe, expect, it } from 'vitest';

import { detectSeparator, parseClientsCsv } from './import-csv';

describe('detectSeparator', () => {
  it('wykrywa srednik z polskiego Excela', () => {
    expect(detectSeparator('Nazwa;Telefon;Email')).toBe(';');
  });

  it('wykrywa przecinek z Google Sheets', () => {
    expect(detectSeparator('Nazwa,Telefon,Email')).toBe(',');
  });

  it('wykrywa tabulator', () => {
    expect(detectSeparator('Nazwa\tTelefon\tEmail')).toBe('\t');
  });

  /**
   * „Kowalski, Jan;500100100" ma i przecinek, i srednik. Liczy sie ten,
   * ktory faktycznie dzieli kolumny — czyli daje wiecej pol.
   */
  it('wybiera separator dajacy wiecej kolumn, nie pierwszy znaleziony', () => {
    expect(detectSeparator('Kowalski, Jan;500100100;krakow')).toBe(';');
  });
});

describe('parseClientsCsv — naglowki', () => {
  it('rozpoznaje polskie naglowki i mapuje kolumny', () => {
    const wynik = parseClientsCsv(
      'Nazwa;Telefon;E-mail;Miasto\nKowalscy;500100100;a@b.pl;Kraków',
    );
    expect(wynik.hadHeader).toBe(true);
    expect(wynik.rows).toHaveLength(1);
    expect(wynik.rows[0]).toMatchObject({
      name: 'Kowalscy',
      phone: '500100100',
      email: 'a@b.pl',
      city: 'Kraków',
    });
  });

  it('naglowki dzialaja bez polskich znakow i wielkich liter', () => {
    const wynik = parseClientsCsv('NAZWA KLIENTA;NR TELEFONU;MIEJSCOWOŚĆ\nNowak;600;Gdańsk');
    expect(wynik.rows[0]).toMatchObject({ name: 'Nowak', phone: '600', city: 'Gdańsk' });
  });

  it('nieznana kolumna jest pomijana, a reszta wchodzi', () => {
    const wynik = parseClientsCsv('Nazwa;NIP;Telefon\nKowalscy;123;500');
    expect(wynik.rows[0]).toMatchObject({ name: 'Kowalscy', phone: '500' });
  });

  /** Wiekszosc arkuszy ma dodatkowa kolumne — warunek „wszystkie musza pasowac" by je odrzucal. */
  it('wystarczy jedna rozpoznana kolumna, zeby uznac wiersz za naglowek', () => {
    const wynik = parseClientsCsv('Nazwa;Cokolwiek;Zupelnie inne\nKowalscy;x;y');
    expect(wynik.hadHeader).toBe(true);
    expect(wynik.rows).toHaveLength(1);
  });

  it('plik bez naglowka tez wchodzi — pierwsza kolumna to nazwa', () => {
    const wynik = parseClientsCsv('Kowalscy;500100100;a@b.pl');
    expect(wynik.hadHeader).toBe(false);
    expect(wynik.rows[0]).toMatchObject({ name: 'Kowalscy', phone: '500100100' });
  });

  it('BOM z Excela nie psuje pierwszego naglowka', () => {
    const wynik = parseClientsCsv('﻿Nazwa;Telefon\nKowalscy;500');
    expect(wynik.hadHeader).toBe(true);
    expect(wynik.rows[0]!.name).toBe('Kowalscy');
  });
});

describe('parseClientsCsv — cytowanie', () => {
  it('przecinek w cudzyslowie nie dzieli pola', () => {
    const wynik = parseClientsCsv('Nazwa,Miasto\n"Kowalski, Jan",Kraków');
    expect(wynik.rows[0]).toMatchObject({ name: 'Kowalski, Jan', city: 'Kraków' });
  });

  it('podwojny cudzyslow w srodku pola to jeden znak', () => {
    const wynik = parseClientsCsv('Nazwa\n"Firma ""ABC"" sp. z o.o."');
    expect(wynik.rows[0]!.name).toBe('Firma "ABC" sp. z o.o.');
  });
});

describe('parseClientsCsv — problemy', () => {
  /**
   * Import, ktory wyklada sie na 300 kontaktach, bo w 47. brakuje nazwiska,
   * jest bezuzyteczny.
   */
  it('wiersz bez nazwy trafia do problemow, reszta wchodzi', () => {
    const wynik = parseClientsCsv('Nazwa;Telefon\nKowalscy;500\n;600\nNowak;700');
    expect(wynik.rows.map((r) => r.name)).toEqual(['Kowalscy', 'Nowak']);
    expect(wynik.issues).toHaveLength(1);
    expect(wynik.issues[0]).toMatchObject({ reason: 'no_name', line: 3 });
  });

  it('powtorzony klient w pliku jest zglaszany raz', () => {
    const wynik = parseClientsCsv('Nazwa;Telefon\nKowalscy;500-100-100\nKowalscy;500 100 100');
    expect(wynik.rows).toHaveLength(1);
    expect(wynik.issues[0]!.reason).toBe('duplicate_in_file');
  });

  it('ten sam klient z innym telefonem to dwa rekordy, nie duplikat', () => {
    const wynik = parseClientsCsv('Nazwa;Telefon\nKowalscy;500\nKowalscy;600');
    expect(wynik.rows).toHaveLength(2);
    expect(wynik.issues).toEqual([]);
  });

  it('puste wiersze sa pomijane bez zglaszania problemu', () => {
    const wynik = parseClientsCsv('Nazwa;Telefon\nKowalscy;500\n\n\nNowak;600\n');
    expect(wynik.rows).toHaveLength(2);
    expect(wynik.issues).toEqual([]);
  });

  it('pusty plik daje pusty wynik, a nie blad', () => {
    const wynik = parseClientsCsv('');
    expect(wynik.rows).toEqual([]);
    expect(wynik.issues).toEqual([]);
  });
});
