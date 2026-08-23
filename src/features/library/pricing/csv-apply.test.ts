import { describe, expect, it } from 'vitest';
import { buildPricingFromCsv, matchCsvRows } from './csv-apply';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { RoomType } from '@/data/repos/room-types.repo';
import type { CsvPricingRow } from '@/domain/library/csv';

const TYPY: RoomType[] = [
  { id: 'rt-kuchnia', workspaceId: 'ws', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 10 },
  { id: 'rt-salon', workspaceId: 'ws', name: 'Salon', slug: 'salon', sortOrder: 20 },
];

function item(partial: Partial<LibraryItem> & { id: string; name: string }): LibraryItem {
  return {
    workspaceId: 'ws',
    category: 'Inne',
    kind: 'item',
    description: '',
    unitPriceCents: 0,
    sortOrder: 0,
    variantOf: null,
    pricing: { mode: 'flat' },
    ...partial,
  };
}

function row(partial: Partial<CsvPricingRow> & { name: string }): CsvPricingRow {
  return { baseCents: null, defaultPerRoomCents: null, perRoomBySlug: {}, ...partial };
}

describe('matchCsvRows', () => {
  const biblioteka = [
    item({ id: '1', name: 'Projekt budowlany' }),
    item({ id: '2', name: 'Wizualizacje 3D' }),
  ];

  it('dopasowuje po nazwie, ignorujac wielkosc liter i nadmiarowe spacje', () => {
    const { matched, unmatched } = matchCsvRows(
      [row({ name: '  projekt   BUDOWLANY ' })],
      biblioteka,
    );

    expect(unmatched).toEqual([]);
    expect(matched[0]?.item.id).toBe('1');
  });

  it('wiersz bez odpowiednika trafia do `unmatched`, a nie zaklada nowej pozycji', () => {
    // Import ma uzupelnic cennik, nie rozmnazac biblioteke o literowki.
    const { matched, unmatched } = matchCsvRows([row({ name: 'Czego tu nie ma' })], biblioteka);

    expect(matched).toEqual([]);
    expect(unmatched[0]?.name).toBe('Czego tu nie ma');
  });

  it('przy duplikatach nazw wygrywa pierwsza pozycja', () => {
    const zDuplikatem = [...biblioteka, item({ id: '3', name: 'Projekt budowlany' })];
    const { matched } = matchCsvRows([row({ name: 'Projekt budowlany' })], zDuplikatem);

    expect(matched[0]?.item.id).toBe('1');
  });
});

describe('buildPricingFromCsv', () => {
  it('pozycja stalocenowa staje sie parametryczna, a jej cena zostaje baza', () => {
    const pozycja = item({ id: '1', name: 'Projekt', unitPriceCents: 20_000 });
    const pricing = buildPricingFromCsv(row({ name: 'Projekt', perRoomBySlug: { kuchnia: 5_000 } }), pozycja, TYPY);

    expect(pricing).toEqual({
      mode: 'per_room',
      baseCents: 20_000,
      perRoomCents: { 'rt-kuchnia': 5_000 },
      defaultPerRoomCents: 0,
      roomScope: 'all',
    });
  });

  it('NIE kasuje stawek, ktorych nie ma w pliku', () => {
    // Ludzie importuja arkusze wypelnione czesciowo. Plik z sama „kuchnia” ma
    // podmienic kuchnie, a nie wyzerowac reszte cennika.
    const pozycja = item({
      id: '1',
      name: 'Projekt',
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: { 'rt-kuchnia': 5_000, 'rt-salon': 4_000 },
        defaultPerRoomCents: 1_500,
        roomScope: 'technical',
      },
    });

    const pricing = buildPricingFromCsv(
      row({ name: 'Projekt', perRoomBySlug: { kuchnia: 9_900 } }),
      pozycja,
      TYPY,
    );

    expect(pricing).toMatchObject({
      perRoomCents: { 'rt-kuchnia': 9_900, 'rt-salon': 4_000 },
      baseCents: 20_000,
      defaultPerRoomCents: 1_500,
      // Zasieg to decyzja z karty pozycji, nie z pliku.
      roomScope: 'technical',
    });
  });

  it('kolumny spoza slownika sa pomijane', () => {
    const pozycja = item({ id: '1', name: 'Projekt' });
    const pricing = buildPricingFromCsv(
      row({ name: 'Projekt', perRoomBySlug: { kuchnia: 5_000, piwnica: 2_000 } }),
      pozycja,
      TYPY,
    );

    // Klucz `piwnica` nie odpowiada zadnemu typowi, wiec nic by go nie odczytalo.
    expect(pricing.mode !== 'flat' && pricing.perRoomCents).toEqual({ 'rt-kuchnia': 5_000 });
  });

  it('pozycja `per_frame` zostaje `per_frame`', () => {
    const pozycja = item({
      id: '1',
      name: 'Wizualizacje',
      pricing: {
        mode: 'per_frame',
        baseCents: 5_000,
        perRoomCents: {},
        defaultPerRoomCents: 30_000,
      },
    });

    const pricing = buildPricingFromCsv(
      row({ name: 'Wizualizacje', perRoomBySlug: { kuchnia: 35_000 } }),
      pozycja,
      TYPY,
    );

    // Import podmienia stawki, nie sposob liczenia.
    expect(pricing.mode).toBe('per_frame');
    expect(pricing.mode === 'per_frame' && pricing.defaultPerRoomCents).toBe(30_000);
  });

  it('baza i „pozostale” z pliku nadpisuja dotychczasowe', () => {
    const pozycja = item({
      id: '1',
      name: 'Projekt',
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: {},
        defaultPerRoomCents: 1_500,
        roomScope: 'all',
      },
    });

    const pricing = buildPricingFromCsv(
      row({ name: 'Projekt', baseCents: 30_000, defaultPerRoomCents: 2_000 }),
      pozycja,
      TYPY,
    );

    expect(pricing).toMatchObject({ baseCents: 30_000, defaultPerRoomCents: 2_000 });
  });
});
