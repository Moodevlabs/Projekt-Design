import { useCallback } from 'react';
import { toast } from 'sonner';
import type { LibraryItem } from '@/data/repos/library.repo';
import { convertItemUnits, type Item, type PricingContext } from '@/domain/quote';
import { libraryItemToQuoteItem } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

/**
 * Zamiana wpisu bibliotecznego na pozycję wyceny — wspólna dla popovera
 * „Z biblioteki” i panelu „Dodaj usługi”.
 *
 * Gdy jednostka wpisu nie zgadza się z trybem wyceny (F2.2), **przeliczamy**
 * po stawce dokumentu i mówimy o tym wprost. Bez stawki nie ma kursu wymiany,
 * więc zwracamy `null` i odmawiamy z komunikatem — wstawienie liczby „jak
 * leci” wpisałoby do oferty 45 groszy tam, gdzie ktoś policzył 45 minut pracy.
 */
export function useInsertFromLibrary(pricing: PricingContext) {
  return useCallback(
    (libraryItem: LibraryItem): Item | null => {
      const wyceniona = libraryItemToQuoteItem(libraryItem);

      if (libraryItem.pricingBasis === pricing.pricingBasis) return wyceniona;

      const przeliczona = convertItemUnits(
        wyceniona,
        libraryItem.pricingBasis,
        pricing.pricingBasis,
        pricing.hourlyRateCents,
      );

      if (!przeliczona) {
        toast.error(pl.editor.libraryBasisMismatch);
        return null;
      }

      toast.info(
        pricing.pricingBasis === 'time'
          ? pl.editor.libraryConvertedToTime
          : pl.editor.libraryConvertedToAmount,
      );
      return przeliczona;
    },
    [pricing.pricingBasis, pricing.hourlyRateCents],
  );
}
