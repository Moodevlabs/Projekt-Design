import { newQuoteBody } from './factory';
import type { QuoteBody } from './schema';
import type { WorkspaceSettings } from '../brand/schema';

/**
 * Nowy dokument wyceny złożony z ustawień workspace'u.
 *
 * **Wszystko, co stąd bierzemy, jest KOPIĄ, nie odwołaniem.** Podniesienie
 * stawki godzinowej albo zmiana VAT-u w ustawieniach nie ma prawa ruszyć kwot
 * w ofertach, które już poszły do klientów — a ruszyłaby, gdyby dokument
 * czytał te wartości z workspace'u przy każdym otwarciu.
 *
 * Wcześniej nowa wycena startowała z wartościami zaszytymi w `newQuoteBody`,
 * więc ustawiony w ustawieniach VAT 8% i tak dawał w dokumencie 23%.
 */
export function quoteBodyFromSettings(
  settings: WorkspaceSettings,
  overrides: Partial<QuoteBody> = {},
): QuoteBody {
  return newQuoteBody({
    vatRate: settings.vatRate,
    pricesInclude: settings.pricesInclude,
    showDisabledItems: settings.showDisabledItems,
    pricingBasis: settings.defaultPricingBasis,
    // Stawkę kopiujemy tylko do wyceny godzinowej: w kwotowej byłaby liczbą
    // bez zastosowania, która myli przy późniejszym przełączeniu trybu.
    hourlyRateCents: settings.defaultPricingBasis === 'time' ? settings.hourlyRateCents : null,
    ...overrides,
  });
}
