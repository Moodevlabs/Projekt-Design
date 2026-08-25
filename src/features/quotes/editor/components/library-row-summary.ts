import type { LibraryItem } from '@/data/repos/library.repo';
import { minRuleCents, priceSuffix, pricingChoiceFor } from '@/domain/library/units';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

/**
 * Opis usługi w wierszu pickera: **sposób wyceny i stawka, zanim klikniesz** (T-70).
 *
 * Do tej pory wiersz pokazywał samą kwotę. Przy usłudze liczonej za
 * pomieszczenie „250,00 zł" wyglądało na cenę końcową, a jest stawką za jedno
 * pomieszczenie — więc wycena wychodziła kilka razy wyższa, niż spodziewał się
 * autor. Inspiracja 1 pokazuje obie informacje obok siebie i to jest cała
 * różnica: „Według pomieszczenia · od 250,00 zł".
 */
export interface LibraryRowSummary {
  /** Etykieta sposobu wyceny — ta sama, co na karcie usługi (T-60). */
  mode: string;
  /** Stawka: „12,00 zł / m²", „od 250,00 zł", „wycena indywidualna". */
  price: string;
  /**
   * Czy kwota zależy od pomieszczeń wyceny.
   *
   * Sterują tym dwie rzeczy w UI: dopisek „od" przy stawce i ostrzeżenie, gdy
   * taka usługa trafia do wyceny bez pomieszczeń.
   */
  dependsOnRooms: boolean;
}

export function libraryRowSummary(item: LibraryItem): LibraryRowSummary {
  const choice = pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents);
  const dependsOnRooms = item.pricing.mode !== 'flat';

  return {
    mode: pl.library.pricingChoices[choice],
    price: priceLabel(item, dependsOnRooms),
    dependsOnRooms,
  };
}

function priceLabel(item: LibraryItem, dependsOnRooms: boolean): string {
  if (dependsOnRooms) {
    /*
     * „od" bierzemy z ręcznie wpisanej ceny minimalnej, a gdy jej nie ma —
     * z najniższej stawki reguły. To INFORMACJA, nie reguła liczenia:
     * `calc` nie zna żadnego dolnego ograniczenia (rozstrzygnięcie T-60).
     */
    const cents = item.minPriceCents ?? minRuleCents(item.pricing);
    return cents === null ? '' : pl.editor.priceFrom(formatMoney(cents));
  }

  // Brak ceny przy trybie stałym znaczy „wycena indywidualna", a nie zero.
  if (item.unitPriceCents === null) return pl.editor.individualPrice;

  return formatMoney(item.unitPriceCents) + priceSuffix(item.unit, item.unitLabel);
}
