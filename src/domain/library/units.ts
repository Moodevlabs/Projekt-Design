import { UnitSchema, type PricingRule, type Unit } from '../quote/schema';

export { UnitSchema };
export type { Unit };

/**
 * Jednostki i „sposób wyceny" (B2, T-60).
 *
 * **Jednostka to etykieta ilości, tryb liczenia to osobna rzecz.** Osiem
 * przycisków z inspiracji nie oznacza ośmiu algorytmów: to trzy istniejące
 * tryby (`flat`, `per_room`, `per_frame`) skrzyżowane z jednostką. Dzięki temu
 * `calcItemCents` nie zmienia się ani o linijkę — a to on liczy pieniądze.
 */
/** Skróty jednostek do wiersza i do PDF. `lump` nie ma skrótu — ryczałt to nie miara. */
const SHORT: Record<Unit, string> = {
  lump: '',
  piece: 'szt.',
  m2: 'm²',
  mb: 'mb',
  hour: 'h',
  visit: 'wizyta',
  element: 'element',
  frame: 'kadr',
  custom: '',
};

/**
 * Etykieta jednostki: „m²", „h", własna nazwa dla `custom`.
 *
 * Pusty string dla ryczałtu jest celowy — „1 ryczałt × 2000 zł" brzmi jak
 * błąd, a „2000 zł" jak cena.
 */
export function unitLabel(unit: Unit, customLabel?: string | null): string {
  if (unit === 'custom') return customLabel?.trim() ?? '';
  return SHORT[unit];
}

/** Ilość z jednostką: „80 m²", „4 h", samo „4" przy ryczałcie. */
export function formatQty(qty: number, unit: Unit, customLabel?: string | null): string {
  const label = unitLabel(unit, customLabel);
  const liczba = Number.isInteger(qty) ? String(qty) : String(qty).replace('.', ',');
  return label ? `${liczba} ${label}` : liczba;
}

/** Sufiks przy cenie jednostkowej: „12,00 zł / m²". */
export function priceSuffix(unit: Unit, customLabel?: string | null): string {
  const label = unitLabel(unit, customLabel);
  return label ? ` / ${label}` : '';
}

/**
 * Osiem opcji „sposobu wyceny" — jeden wybór w UI, para `(mode, unit)` pod spodem.
 *
 * Kolejność jak w inspiracji: od najczęstszego do najrzadszego.
 */
export const PRICING_CHOICES = [
  { id: 'flat_lump', mode: 'flat', unit: 'lump' },
  { id: 'flat_m2', mode: 'flat', unit: 'm2' },
  { id: 'per_room', mode: 'per_room', unit: 'lump' },
  { id: 'per_frame', mode: 'per_frame', unit: 'frame' },
  { id: 'flat_hour', mode: 'flat', unit: 'hour' },
  { id: 'flat_visit', mode: 'flat', unit: 'visit' },
  { id: 'flat_element', mode: 'flat', unit: 'element' },
  { id: 'individual', mode: 'flat', unit: 'lump' },
] as const;

export type PricingChoiceId = (typeof PRICING_CHOICES)[number]['id'];

/**
 * Który z ośmiu wyborów odpowiada zapisanej parze.
 *
 * „Indywidualnie" poznajemy po **braku ceny**, a nie po trybie: to `flat`
 * z ceną `null`. Bez tego rozróżnienia karta usługi pokazywałaby „Kwota
 * stała" przy pozycji, która żadnej kwoty nie ma.
 */
export function pricingChoiceFor(
  mode: PricingRule['mode'],
  unit: Unit,
  unitPriceCents: number | null,
): PricingChoiceId {
  if (mode === 'flat' && unitPriceCents === null) return 'individual';
  if (mode === 'per_room') return 'per_room';
  if (mode === 'per_frame') return 'per_frame';

  const match = PRICING_CHOICES.find(
    (choice) => choice.id !== 'individual' && choice.mode === mode && choice.unit === unit,
  );
  return match?.id ?? 'flat_lump';
}

/**
 * Najniższa stawka reguły — do „od 350 zł" na liście.
 *
 * Dla `per_room`/`per_frame` bez ręcznie wpisanego „od" bierzemy minimum ze
 * stawek; `null`, gdy nie ma z czego liczyć. To **informacja**, nie reguła
 * liczenia: clamp od dołu w `calc` byłby ukrytą logiką, której użytkownik nie
 * odtworzy z dokumentu (koncepcja §5 reguła 4).
 */
export function minRuleCents(rule: PricingRule): number | null {
  if (rule.mode === 'flat') return null;

  const perRoom = Object.values(rule.perRoomCents).filter((cents) => cents > 0);
  const domyslna = rule.defaultPerRoomCents > 0 ? [rule.defaultPerRoomCents] : [];
  // Baza doliczana do każdego pomieszczenia też podnosi minimum — pominięcie
  // jej dawałoby „od 0 zł" przy usłudze, która nigdy nie kosztuje zera.
  const baza = rule.baseCents > 0 ? rule.baseCents : 0;

  const stawki = [...perRoom, ...domyslna];
  if (stawki.length === 0) return baza > 0 ? baza : null;
  return Math.min(...stawki) + baza;
}
