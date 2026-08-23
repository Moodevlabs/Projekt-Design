import { describe, expect, it } from 'vitest';
import { parsePricingCsv } from './csv';

const SLUGI = ['kuchnia', 'salon', 'lazienka'];

describe('parsePricingCsv — format z Excela', () => {
  it('czyta macierz z separatorem `;` i przecinkiem dziesietnym', () => {
    const csv = ['nazwa;baza;kuchnia;salon;pozostale', 'Projekt budowlany;200;50,50;40;15'].join(
      '\n',
    );

    const { rows, problems } = parsePricingCsv(csv, SLUGI);

    expect(problems).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      name: 'Projekt budowlany',
      baseCents: 20_000,
      defaultPerRoomCents: 1_500,
      perRoomBySlug: { kuchnia: 5_050, salon: 4_000 },
    });
  });

  it('radzi sobie z separatorem `,` i kropka dziesietna', () => {
    const csv = ['nazwa,baza,kuchnia', 'Wizualizacje,350.00,45'].join('\n');

    const { rows } = parsePricingCsv(csv, SLUGI);
    expect(rows[0]?.baseCents).toBe(35_000);
    expect(rows[0]?.perRoomBySlug).toEqual({ kuchnia: 4_500 });
  });

  it('zjada BOM, ktory Excel dokleja na poczatku pliku', () => {
    const csv = '﻿nazwa;kuchnia\nProjekt;50';

    const { rows, problems } = parsePricingCsv(csv, SLUGI);
    // Bez tego pierwszy naglowek nazywalby sie „<BOM>nazwa” i kolumna nazwy
    // bylaby nie do znalezienia.
    expect(problems).toEqual([]);
    expect(rows[0]?.name).toBe('Projekt');
  });

  it('respektuje cudzyslowy wokol tekstu z separatorem', () => {
    const csv = ['nazwa;kuchnia', '"Projekt wnetrz; etap I";50'].join('\n');

    const { rows } = parsePricingCsv(csv, SLUGI);
    expect(rows[0]?.name).toBe('Projekt wnetrz; etap I');
  });

  it('podwojny cudzyslow w srodku to jeden znak', () => {
    const csv = ['nazwa;kuchnia', '"Projekt ""pod klucz""";50'].join('\n');

    const { rows } = parsePricingCsv(csv, SLUGI);
    expect(rows[0]?.name).toBe('Projekt "pod klucz"');
  });

  it('pusta komorka to BRAK stawki, nie zero', () => {
    // Import czesciowo wypelnionego arkusza nie moze skasowac cennika.
    const csv = ['nazwa;kuchnia;salon', 'Projekt;50;'].join('\n');

    const { rows } = parsePricingCsv(csv, SLUGI);
    expect(rows[0]?.perRoomBySlug).toEqual({ kuchnia: 5_000 });
    expect(rows[0]?.perRoomBySlug).not.toHaveProperty('salon');
  });

  it('brak kolumny `baza` daje null, a nie zero', () => {
    const csv = ['nazwa;kuchnia', 'Projekt;50'].join('\n');

    const { rows } = parsePricingCsv(csv, SLUGI);
    expect(rows[0]?.baseCents).toBeNull();
    expect(rows[0]?.defaultPerRoomCents).toBeNull();
  });
});

describe('parsePricingCsv — problemy', () => {
  it('brak kolumny z nazwa przerywa import z czytelnym komunikatem', () => {
    const { rows, problems } = parsePricingCsv('kuchnia;salon\n50;40', SLUGI);

    expect(rows).toEqual([]);
    expect(problems[0]?.message).toMatch(/nazw/i);
  });

  it('pusty plik nie wywala parsera', () => {
    const { rows, problems } = parsePricingCsv('   \n\n', SLUGI);

    expect(rows).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it('wiersz bez nazwy jest pomijany, reszta wchodzi', () => {
    const csv = ['nazwa;kuchnia', ';50', 'Projekt;60'].join('\n');

    const { rows, problems } = parsePricingCsv(csv, SLUGI);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Projekt');
    // Uzytkownik ma wiedziec, ktory wiersz odpadl — numeracja jak w Excelu.
    expect(problems[0]?.line).toBe(2);
  });

  it('nieczytelna kwota zglaszana jest z numerem wiersza i kolumna', () => {
    const csv = ['nazwa;kuchnia', 'Projekt;okolo piecdziesieciu'].join('\n');

    const { rows, problems } = parsePricingCsv(csv, SLUGI);
    expect(problems[0]?.line).toBe(2);
    expect(problems[0]?.message).toContain('kuchnia');
    // Reszta wiersza sie zapisuje — jedna zla komorka nie kasuje pozycji.
    expect(rows).toHaveLength(1);
    expect(rows[0]?.perRoomBySlug).toEqual({});
  });

  it('zglasza kolumny, ktorych nie ma w slowniku', () => {
    const csv = ['nazwa;kuchnia;piwnica', 'Projekt;50;20'].join('\n');

    const { unknownSlugs, rows } = parsePricingCsv(csv, SLUGI);
    expect(unknownSlugs).toEqual(['piwnica']);
    // Dane wracaja w calosci — co z nimi zrobic, decyduje warstwa wyzej.
    expect(rows[0]?.perRoomBySlug).toEqual({ kuchnia: 5_000, piwnica: 2_000 });
  });

  it('bez podanego slownika nie zglasza nieznanych kolumn', () => {
    const { unknownSlugs } = parsePricingCsv('nazwa;cokolwiek\nProjekt;50');
    expect(unknownSlugs).toEqual([]);
  });
});
