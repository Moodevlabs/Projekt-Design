import type { LibraryColor } from '@/domain/library/schema';

/**
 * Paleta kolorów grup — **tokeny, nie dowolny hex** (05-UI).
 *
 * Dowolny kolor pozwoliłby wybrać biel na białej karcie albo dwa odcienie
 * nieodróżnialne obok siebie. Siedem wartości starcza na dział projektowy
 * i gwarantuje, że pigułka będzie czytelna na tle listy.
 *
 * Osobny plik od komponentu, żeby ten eksportował wyłącznie komponenty
 * i nie tracił Fast Refresh.
 */
/*
 * Cztery z siedmiu odcieni (`sand`, `sage`, `clay`, `moss`) były ciepłe od
 * początku i przeszły redesign bez zmiany. Przestrojone zostały tylko trzy
 * chłodne — `sky`, `plum` i `slate` — bo na beżowej karcie odcinały się
 * jako wklejone z innego systemu.
 *
 * Klucze (nazwy) zostają bez zmian: siedzą w bazie jako wartość kolumny
 * `library_categories.color`. Zmiana nazwy wymagałaby migracji, a zmieniamy
 * tylko to, jak odcień wygląda — nie to, czym jest.
 */
export const SWATCHES: Record<LibraryColor, string> = {
  sand: '#D8C3A5',
  sage: '#A8B5A0',
  sky: '#A9B3AE',
  clay: '#C08A72',
  plum: '#A8909C',
  moss: '#8A9A5B',
  slate: '#948C86',
};

/** Kolor tła pigułki grupy. `undefined` = grupa bez koloru. */
export function categorySwatch(color: LibraryColor | null): string | undefined {
  return color ? SWATCHES[color] : undefined;
}
