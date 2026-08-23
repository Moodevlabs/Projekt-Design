import { roundCents } from '../money';
import type { Item, PricingBasis, PricingRule } from './schema';

/**
 * Przeliczanie liczb pozycji między groszami a minutami (F2.2).
 *
 * Potrzebne w dwóch miejscach i w obu chodzi o to samo: **liczba bez jednostki
 * kłamie**. Wpis biblioteczny „45" znaczy 45 groszy albo 45 minut zależnie od
 * tego, w jakim trybie powstał — wstawiony do wyceny w drugim trybie musi
 * zostać przeliczony albo odrzucony, ale nigdy przepisany bez zmian.
 *
 *  1. wstawianie pozycji z biblioteki do wyceny o innym trybie,
 *  2. przełączenie trybu wyceny, która ma już pozycje.
 */

const MINUTES_PER_HOUR = 60;

/**
 * Przelicza jedną liczbę.
 *
 * `null` znaczy „nie da się" — bez stawki nie ma kursu wymiany między minutą
 * a groszem. Zwracamy `null`, a nie zero czy wartość niezmienioną: obie te
 * odpowiedzi wyglądałyby na poprawne i po cichu wpisałyby do oferty liczbę
 * z sufitu.
 */
export function convertUnits(
  value: number,
  from: PricingBasis,
  to: PricingBasis,
  hourlyRateCents: number | null,
): number | null {
  if (from === to) return value;
  if (!hourlyRateCents) return null;

  return to === 'amount'
    ? roundCents((value / MINUTES_PER_HOUR) * hourlyRateCents)
    : // Minuty zaokrąglamy do pełnych — pół minuty w cenniku nikomu nie służy.
      Math.round((value * MINUTES_PER_HOUR) / hourlyRateCents);
}

/** Przelicza wszystkie liczby reguły cenowej. `null`, gdy nie da się przeliczyć. */
export function convertPricingRule(
  pricing: PricingRule,
  from: PricingBasis,
  to: PricingBasis,
  hourlyRateCents: number | null,
): PricingRule | null {
  if (from === to) return pricing;
  if (!hourlyRateCents) return null;

  const convert = (value: number) => convertUnits(value, from, to, hourlyRateCents) ?? value;

  if (pricing.mode === 'flat') return pricing;

  const perRoomCents = Object.fromEntries(
    Object.entries(pricing.perRoomCents).map(([id, value]) => [id, convert(value)]),
  );

  if (pricing.mode === 'per_room') {
    return {
      ...pricing,
      baseCents: convert(pricing.baseCents),
      defaultPerRoomCents: convert(pricing.defaultPerRoomCents),
      perRoomCents,
    };
  }

  return {
    ...pricing,
    baseCents: convert(pricing.baseCents),
    defaultPerRoomCents: convert(pricing.defaultPerRoomCents),
    perRoomCents,
  };
}

/**
 * Przelicza pozycję wyceny.
 *
 * Rusza **wyłącznie liczby cenowe**. `qty`, `frames`, `enabled` i przypisanie
 * do pomieszczenia opisują zakres pracy, a nie jej wartość — przeliczanie ich
 * po kursie stawki nie miałoby sensu.
 */
export function convertItemUnits(
  item: Item,
  from: PricingBasis,
  to: PricingBasis,
  hourlyRateCents: number | null,
): Item | null {
  if (from === to) return item;

  const unitPriceCents = convertUnits(item.unitPriceCents, from, to, hourlyRateCents);
  const pricing = convertPricingRule(item.pricing, from, to, hourlyRateCents);
  if (unitPriceCents === null || pricing === null) return null;

  return { ...item, unitPriceCents, pricing };
}
