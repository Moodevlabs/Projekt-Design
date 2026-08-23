import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from './editor.store';
import { formatMoney } from '@/domain/money';
import type { PricingBasis } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Zmiana sposobu liczenia wyceny (F2.2).
 *
 * **Pytamy tylko wtedy, gdy jest o co pytać.** Pusta wycena nie ma liczb, które
 * mogłyby zmienić znaczenie, więc dialog byłby czystą przeszkodą — przełącznik
 * ma wtedy działać od razu.
 *
 * Gdy pozycje są, decyzja należy do użytkownika i obie odpowiedzi są sensowne:
 *  - **Przelicz** — mam gotową wycenę kwotową i chcę ją zobaczyć od strony czasu.
 *  - **Zostaw liczby** — liczby od początku były minutami, tylko dokument miał
 *    zły tryb.
 *
 * Bez stawki nie ma po czym przeliczać, więc zostaje tylko druga opcja i mówimy
 * o tym wprost, zamiast pokazywać przycisk, który nic nie zrobi.
 */
export function usePricingBasisChange() {
  const setPricingBasis = useEditorStore((state) => state.setPricingBasis);
  const [pending, setPending] = useState<PricingBasis | null>(null);

  const request = useCallback(
    (basis: PricingBasis) => {
      const { body } = useEditorStore.getState();
      if (!body || body.pricingBasis === basis) return;

      const maPozycje = body.sections.some(
        (section) =>
          section.items.length > 0 || section.groups.some((group) => group.items.length > 0),
      );

      if (!maPozycje) {
        setPricingBasis(basis, false);
        return;
      }

      setPending(basis);
    },
    [setPricingBasis],
  );

  const resolve = useCallback(
    (convert: boolean) => {
      if (!pending) return;
      setPricingBasis(pending, convert);

      if (convert) {
        toast.success(
          pending === 'time' ? pl.editor.convertedToTime : pl.editor.convertedToAmount,
        );
      }
      setPending(null);
    },
    [pending, setPricingBasis],
  );

  const rate = useEditorStore((state) => state.body?.hourlyRateCents ?? null);

  return {
    /** Tryb, o który właśnie pytamy; `null` = dialog zamknięty. */
    pending,
    /** Czy da się przeliczyć — bez stawki nie ma kursu wymiany. */
    canConvert: rate !== null,
    description: rate
      ? pl.editor.convertDescription(`${formatMoney(rate, 'PLN')}/h`)
      : pl.editor.convertDescriptionNoRate,
    request,
    resolve,
    cancel: useCallback(() => setPending(null), []),
  };
}
