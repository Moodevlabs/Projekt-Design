import type { LibraryItem } from '@/data/repos/library.repo';
import type { RoomType } from '@/data/repos/room-types.repo';
import type { CsvPricingRow } from '@/domain/library/csv';
import type { PricingRule } from '@/domain/quote';

/**
 * Dopasowanie wierszy z pliku do pozycji biblioteki i złożenie z nich reguł.
 *
 * Wyjęte z komponentu, bo to jedyna część importu, która może po cichu zepsuć
 * cennik — i jedyna, którą warto sprawdzać testem bez renderowania dialogu.
 */

export interface MatchedRow {
  row: CsvPricingRow;
  item: LibraryItem;
}

export interface MatchResult {
  matched: MatchedRow[];
  /** Wiersze bez odpowiednika w bibliotece — pokazujemy je, nie zakładamy nowych pozycji. */
  unmatched: CsvPricingRow[];
}

/** Nazwy porównujemy bez wielkości liter i nadmiarowych spacji — plik bywa przepisywany ręcznie. */
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function matchCsvRows(rows: CsvPricingRow[], items: LibraryItem[]): MatchResult {
  const byName = new Map<string, LibraryItem>();
  for (const item of items) {
    // Przy duplikatach nazw wygrywa pierwsza pozycja — import nie jest miejscem
    // na rozstrzyganie, którą z dwóch identycznie nazwanych user miał na myśli.
    const key = normalize(item.name);
    if (!byName.has(key)) byName.set(key, item);
  }

  const matched: MatchedRow[] = [];
  const unmatched: CsvPricingRow[] = [];

  for (const row of rows) {
    const item = byName.get(normalize(row.name));
    if (item) matched.push({ row, item });
    else unmatched.push(row);
  }

  return { matched, unmatched };
}

/**
 * Składa nową regułę cenową z wiersza pliku, **dokładając** stawki do tego, co
 * pozycja już ma.
 *
 * Kluczowa decyzja: kolumna nieobecna w pliku (albo pusta komórka) **nie
 * kasuje** istniejącej stawki. Ludzie importują arkusze wypełnione częściowo —
 * plik z samą kolumną „kuchnia” ma podmienić kuchnię, a nie wyzerować resztę
 * cennika.
 */
export function buildPricingFromCsv(
  row: CsvPricingRow,
  item: LibraryItem,
  roomTypes: RoomType[],
): PricingRule {
  const bySlug = new Map(roomTypes.map((type) => [type.slug, type.id]));

  const current =
    item.pricing.mode === 'flat'
      ? {
          // Pozycja stałocenowa staje się parametryczna dopiero przez import —
          // jej dotychczasowa cena zostaje bazą, żeby nic nie zniknęło.
          baseCents: item.unitPriceCents,
          perRoomCents: {} as Record<string, number>,
          defaultPerRoomCents: 0,
        }
      : {
          baseCents: item.pricing.baseCents,
          perRoomCents: item.pricing.perRoomCents,
          defaultPerRoomCents: item.pricing.defaultPerRoomCents,
        };

  const perRoomCents = { ...current.perRoomCents };
  for (const [slug, cents] of Object.entries(row.perRoomBySlug)) {
    const roomTypeId = bySlug.get(slug);
    // Kolumny spoza słownika pomijamy — zapisanie ich pod slugiem zaśmieciłoby
    // regułę kluczami, których nic nigdy nie odczyta.
    if (roomTypeId) perRoomCents[roomTypeId] = cents;
  }

  // Cena „indywidualna" (`null`) nie jest baza — macierz operuje liczbami,
  // wiec brak ceny znaczy tu zero, a nie „przepisz null do reguly".
  const baseCents = row.baseCents ?? current.baseCents ?? 0;
  const defaultPerRoomCents = row.defaultPerRoomCents ?? current.defaultPerRoomCents;

  if (item.pricing.mode === 'per_frame') {
    return { mode: 'per_frame', baseCents, perRoomCents, defaultPerRoomCents };
  }

  return {
    mode: 'per_room',
    baseCents,
    perRoomCents,
    defaultPerRoomCents,
    roomScope: item.pricing.mode === 'per_room' ? item.pricing.roomScope : 'all',
  };
}
