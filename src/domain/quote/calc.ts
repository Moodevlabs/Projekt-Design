import { roundCents } from '../money';
import type { Group, Item, PricesInclude, QuoteBody, Section } from './schema';

/** Podsumowanie kwotowe — wszystkie wartości to całkowite grosze. */
export interface QuoteTotals {
  /** Suma pozycji `kind: 'item'` (włączonych). */
  itemsCents: number;
  /** Suma rabatów `kind: 'discount'` (włączonych), jako wartość dodatnia. */
  discountsCents: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

/** Kontekst podatkowy potrzebny do policzenia VAT-u dla fragmentu wyceny. */
export interface TotalsOptions {
  vatRate: number;
  pricesInclude: PricesInclude;
}

/**
 * Domyślnie fragmenty (grupa/sekcja) liczymy bez VAT-u — UI pokazuje przy nich
 * sumę „jak wpisano”. Pełny kontekst przekazuje `calcQuoteTotals`.
 */
const DEFAULT_TOTALS_OPTIONS: TotalsOptions = { vatRate: 0, pricesInclude: 'net' };

/** Podsumowanie całej wyceny (stawka VAT i tryb cen brane z `body`). */
export function calcQuoteTotals(body: QuoteBody): QuoteTotals {
  const sums = sumItems(body.sections.flatMap(sectionItems));
  return buildTotals(sums, { vatRate: body.vatRate, pricesInclude: body.pricesInclude });
}

/** Podsumowanie sekcji (razem z jej grupami) — do nagłówków w edytorze i PDF. */
export function calcSectionTotals(
  section: Section,
  options: Partial<TotalsOptions> = {},
): QuoteTotals {
  return buildTotals(sumItems(sectionItems(section)), { ...DEFAULT_TOTALS_OPTIONS, ...options });
}

/** Podsumowanie pojedynczej grupy — do nagłówków w edytorze i PDF. */
export function calcGroupTotals(group: Group, options: Partial<TotalsOptions> = {}): QuoteTotals {
  return buildTotals(sumItems(group.items), { ...DEFAULT_TOTALS_OPTIONS, ...options });
}

/** Wszystkie pozycje sekcji: luźne + te w grupach. */
function sectionItems(section: Section): Item[] {
  return [...section.items, ...section.groups.flatMap((group) => group.items)];
}

/** Sumuje włączone pozycje, rozdzielając zwykłe pozycje od rabatów. */
function sumItems(items: Item[]): Pick<QuoteTotals, 'itemsCents' | 'discountsCents'> {
  let itemsCents = 0;
  let discountsCents = 0;

  for (const item of items) {
    if (!item.enabled) continue;
    // qty może być ułamkowe (np. 2,5 h) — zaokrąglamy dopiero wartość pozycji.
    const valueCents = roundCents(item.qty * item.unitPriceCents);
    if (item.kind === 'discount') {
      discountsCents += valueCents;
    } else {
      itemsCents += valueCents;
    }
  }

  return { itemsCents, discountsCents };
}

/**
 * Składa podsumowanie z sum cząstkowych.
 *
 * Rabat większy niż suma pozycji **nie** daje wartości ujemnej — podstawa jest
 * przycinana do zera (`max(0, ...)`). Klientowi nie wystawiamy „ujemnej wyceny”.
 *
 * `pricesInclude: 'net'`  → wpisane ceny to netto: VAT doliczamy do sumy.
 * `pricesInclude: 'gross'`→ wpisane ceny to brutto: suma jest kwotą brutto,
 *                           netto wyliczamy w dół (`brutto / (1 + vat/100)`),
 *                           a VAT to różnica — dzięki temu `netto + VAT === brutto`
 *                           co do grosza, bez błędów zaokrągleń.
 */
function buildTotals(
  sums: Pick<QuoteTotals, 'itemsCents' | 'discountsCents'>,
  options: TotalsOptions,
): QuoteTotals {
  const base = Math.max(0, sums.itemsCents - sums.discountsCents);

  if (options.pricesInclude === 'gross') {
    const grossCents = base;
    const netCents = roundCents(grossCents / (1 + options.vatRate / 100));
    return { ...sums, netCents, vatCents: grossCents - netCents, grossCents };
  }

  const netCents = base;
  const vatCents = roundCents((netCents * options.vatRate) / 100);
  return { ...sums, netCents, vatCents, grossCents: netCents + vatCents };
}
