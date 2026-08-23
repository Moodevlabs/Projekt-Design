import { useMemo } from 'react';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import { groupVariants, variantGroupId } from '@/domain/library/variants';
import type { LibraryItem } from '@/data/repos/library.repo';

/** Warianty do wyboru, po identyfikatorze wpisu bibliotecznego w wierszu. */
export type VariantOptions = ReadonlyMap<string, LibraryItem[]>;

/**
 * Stała pusta mapa — **referencja musi być stabilna**.
 *
 * `ItemRow` jest zmemoizowany, a `new Map()` przy każdym renderze przebiłby
 * `memo` na wszystkich wierszach naraz. Dokładnie ten sam błąd złapał kiedyś
 * test wydajnościowy na `rooms={[]}` (T-35).
 */
export const NO_VARIANTS: VariantOptions = new Map();

/**
 * Warianty pozycji bibliotecznych dla otwartej wyceny (F1.4).
 *
 * Edytor pobiera tu **całą bibliotekę**, choć potrzebuje z niej tylko grup
 * wariantów. To świadomy kompromis: zapytanie ma ten sam klucz co panel
 * biblioteki, więc płacimy za nie raz, a otwarcie panelu jest potem
 * natychmiastowe. Wariant liczony zapytaniem per wiersz byłby dziesiątkami
 * zapytań na jeden dokument.
 *
 * Mapa jest indeksowana po **każdym** członku grupy, nie po liderze — wiersz
 * wyceny wie tylko, którym wpisem jest, i nie ma skąd znać lidera.
 */
export function useVariantOptions(): VariantOptions {
  const library = useAllLibraryItems();
  const items = library.data;

  return useMemo(() => {
    if (!items || items.length === 0) return NO_VARIANTS;

    const groups = groupVariants(items);
    const options = new Map<string, LibraryItem[]>();

    for (const item of items) {
      const group = groups.get(variantGroupId(item));
      // Grupa jednoelementowa to „brak wariantów" — nie ma z czego wybierać,
      // więc taki wpis w ogóle nie trafia do mapy.
      if (group && group.length > 1) options.set(item.id, group);
    }

    return options.size > 0 ? options : NO_VARIANTS;
  }, [items]);
}
