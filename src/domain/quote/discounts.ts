import { roundCents } from '../money';
import { calcItemCents } from './calc';
import type { Discount, Item, QuoteBody, Room, Section } from './schema';

/**
 * Rozliczenie jednego rabatu. UI potrzebuje nie tylko kwoty, ale i **powodu**:
 * rabat warunkowy pokazany jako „0 zł” bez wyjaśnienia wygląda jak błąd, a nie
 * jak zachęta do dobrania całego etapu.
 */
export interface DiscountLine {
  discountId: string;
  /** Kwota rabatu w groszach, już po zaokrągleniu i przycięciu do podstawy. */
  amountCents: number;
  /** Podstawa, od której liczył się procent (dla `fixed` — zakres rabatu). */
  baseCents: number;
  /** Czy warunek naliczenia jest spełniony. */
  conditionMet: boolean;
  /** Ile pozycji w zakresie jest włączonych i ile ich w ogóle jest — „3/5”. */
  enabledInScope: number;
  itemsInScope: number;
}

export interface DiscountsResult {
  totalCents: number;
  lines: DiscountLine[];
}

/** Wszystkie pozycje sekcji: luźne + te w grupach. */
function sectionItems(section: Section): Item[] {
  return [...section.items, ...section.groups.flatMap((group) => group.items)];
}

function allItems(body: QuoteBody): Item[] {
  return body.sections.flatMap(sectionItems);
}

/**
 * Pozycje objęte rabatem. Rabaty liczą się **od pozycji, nie od rabatów** —
 * dlatego pozycje `kind: 'discount'` (stare rabaty kwotowe) nie wchodzą do
 * podstawy; inaczej procent naliczałby się od cudzej obniżki.
 */
function itemsInScope(body: QuoteBody, discount: Discount): Item[] {
  const base = allItems(body).filter((item) => item.kind !== 'discount');

  if (discount.scope === 'section') {
    const section = body.sections.find((candidate) => candidate.id === discount.sectionId);
    return section ? sectionItems(section).filter((item) => item.kind !== 'discount') : [];
  }

  if (discount.scope === 'items') {
    const wanted = new Set(discount.itemIds);
    return base.filter((item) => wanted.has(item.id));
  }

  return base;
}

/**
 * Zaokrąglenie do wielokrotności — odpowiednik `MROUND` z arkusza.
 * `step <= 0` znaczy „nie zaokrąglaj”.
 */
export function roundToStep(cents: number, step: number): number {
  if (step <= 0) return cents;
  return Math.round(cents / step) * step;
}

/**
 * Liczy rabaty wyceny.
 *
 * Kolejność ma znaczenie: najpierw rabaty na sekcje i wskazane pozycje, potem
 * rabaty na całość — te ostatnie liczą się od kwoty **już pomniejszonej**.
 * Inaczej dwa rabaty po 50% dałyby razem 100% i zerową wycenę.
 *
 * Suma rabatów nigdy nie przekracza sumy pozycji (arkusz tego nie pilnuje, my
 * tak) — klientowi nie wystawiamy ujemnej wyceny.
 */
export function calcDiscounts(body: QuoteBody, rooms: Room[] = body.rooms): DiscountsResult {
  const valueOf = (items: Item[]) =>
    items
      .filter((item) => item.enabled)
      .reduce((sum, item) => sum + calcItemCents(item, rooms), 0);

  const itemsTotal = valueOf(allItems(body).filter((item) => item.kind !== 'discount'));

  const lines: DiscountLine[] = [];
  let running = 0;

  const order = [...body.discounts].sort(
    (a, b) => Number(a.scope === 'quote') - Number(b.scope === 'quote'),
  );

  for (const discount of order) {
    const scoped = itemsInScope(body, discount);
    const enabled = scoped.filter((item) => item.enabled);

    // Rabat na całość liczy się od tego, co zostało po rabatach cząstkowych.
    const baseCents =
      discount.scope === 'quote' ? Math.max(0, itemsTotal - running) : valueOf(scoped);

    const conditionMet =
      discount.condition === 'always' || (scoped.length > 0 && enabled.length === scoped.length);

    let amountCents = 0;
    if (discount.enabled && conditionMet) {
      const raw =
        discount.type === 'percent'
          ? (baseCents * (discount.percent ?? 0)) / 100
          : (discount.valueCents ?? 0);

      amountCents = roundToStep(roundCents(raw), discount.roundToCents);
      // Rabat nie może zjeść więcej, niż zostało do zjedzenia.
      amountCents = Math.min(amountCents, Math.max(0, itemsTotal - running));
    }

    running += amountCents;
    lines.push({
      discountId: discount.id,
      amountCents,
      baseCents,
      conditionMet,
      enabledInScope: enabled.length,
      itemsInScope: scoped.length,
    });
  }

  return { totalCents: running, lines };
}
