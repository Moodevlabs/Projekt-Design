import type { PriceListDoc } from './price-list';
import type { QuoteDocuments, StagesDoc } from './schema';

/**
 * Czy dokument towarzyszący ma TREŚĆ, a nie tylko istnieje (T-115).
 *
 * Zakładki Etapy i Cennik startują puste (T-111); wejście na nie zakłada
 * powłokę `{ entries: [] }` / `{ items: [] }`. Powłoka nie jest dokumentem —
 * patrz `scheduleHasContent`. Każde „czy wycena ma etapy / cennik?" pyta tu.
 */
export function stagesHasContent(doc: StagesDoc | null | undefined): boolean {
  return Boolean(doc && doc.entries.length > 0);
}

export function priceListHasContent(doc: PriceListDoc | null | undefined): boolean {
  return Boolean(doc && doc.items.length > 0);
}

/** Czy KTÓRYKOLWIEK z dokumentów towarzyszących ma treść. */
export function documentsHaveContent(documents: QuoteDocuments | null | undefined): boolean {
  return stagesHasContent(documents?.stages) || priceListHasContent(documents?.priceList);
}
