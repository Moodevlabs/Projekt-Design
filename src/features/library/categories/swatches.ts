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
export const SWATCHES: Record<LibraryColor, string> = {
  sand: '#D8C3A5',
  sage: '#A8B5A0',
  sky: '#9DB4C0',
  clay: '#C08A72',
  plum: '#A98BA5',
  moss: '#8A9A5B',
  slate: '#8C93A8',
};

/** Kolor tła pigułki grupy. `undefined` = grupa bez koloru. */
export function categorySwatch(color: LibraryColor | null): string | undefined {
  return color ? SWATCHES[color] : undefined;
}
