import type { QuoteBody, Item } from './schema';

/**
 * Pozycje wyceniane indywidualnie (T-60).
 *
 * Cena `null` znaczy „ustalimy osobno" — pozycja jest w ofercie, ale nie
 * wchodzi do sumy. Podsumowanie **musi o tym powiedzieć**: bez dopisku
 * „+ N pozycji wycenianych indywidualnie" klient dostaje kwotę, która nie
 * obejmuje wszystkiego, co widzi na liście, i nikt go o tym nie uprzedza.
 *
 * Liczymy tylko **włączone** pozycje: wyłączona (TAK/NIE) nie jest częścią
 * oferty, więc nie ma o czym uprzedzać.
 */
function allItems(body: QuoteBody): Item[] {
  return body.sections.flatMap((section) => [
    ...section.items,
    ...section.groups.flatMap((group) => group.items),
  ]);
}

/**
 * Czy pozycja jest „wyceniana indywidualnie" — jedno pytanie dla wiersza,
 * PDF-u i podsumowania, żeby nie mówiły trzech różnych rzeczy.
 *
 * Nadpisanie ręczne (T-127) zdejmuje ten status: ktoś wpisał kwotę, więc
 * pozycja MA cenę i wchodzi do sumy — `calcItemUnits` liczy ją tak samo.
 */
export function isIndividualItem(item: Item): boolean {
  return item.unitPriceCents === null && item.priceOverrideCents === null;
}

export function countIndividualItems(body: QuoteBody): number {
  return allItems(body).filter(
    (item) => item.enabled && item.kind === 'item' && isIndividualItem(item),
  ).length;
}
