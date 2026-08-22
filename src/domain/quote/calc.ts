import { roundCents } from '../money';
import { calcDiscounts } from './discounts';
import type { Group, Item, PricesInclude, QuoteBody, Room, RoomScope, Section } from './schema';

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

/**
 * Kontekst potrzebny do policzenia fragmentu wyceny: stawka VAT, tryb cen
 * oraz **pomieszczenia** — bez nich pozycja `per_room` nie ma z czego liczyć
 * swojego składnika i wyszłaby sama baza.
 */
export interface TotalsOptions {
  vatRate: number;
  pricesInclude: PricesInclude;
  rooms: Room[];
}

/**
 * Domyślnie fragmenty (grupa/sekcja) liczymy bez VAT-u — UI pokazuje przy nich
 * sumę „jak wpisano”. Pełny kontekst przekazuje `calcQuoteTotals`.
 */
const DEFAULT_TOTALS_OPTIONS: TotalsOptions = { vatRate: 0, pricesInclude: 'net', rooms: [] };

/**
 * Podsumowanie całej wyceny (stawka VAT, tryb cen i pomieszczenia z `body`).
 *
 * `discountsCents` zbiera **oba** źródła obniżek: pozycje `kind: 'discount'`
 * (rabaty kwotowe wpisane jako wiersz wyceny) oraz `body.discounts` (rabaty
 * procentowe i warunkowe). Przeniesienie tych pierwszych do drugiego mechanizmu
 * dzieje się razem z UI w T-36 — do tego czasu muszą się liczyć równolegle,
 * inaczej istniejące wyceny nagle podrożałyby.
 */
export function calcQuoteTotals(body: QuoteBody): QuoteTotals {
  const sums = sumItems(body.sections.flatMap(sectionItems), body.rooms);
  const discounts = calcDiscounts(body, body.rooms);

  return buildTotals(
    { ...sums, discountsCents: sums.discountsCents + discounts.totalCents },
    {
      vatRate: body.vatRate,
      pricesInclude: body.pricesInclude,
      rooms: body.rooms,
    },
  );
}

/**
 * Podsumowanie sekcji (razem z jej grupami) — do nagłówków w edytorze i PDF.
 *
 * Wołający musi podać `rooms`, jeśli sekcja zawiera pozycje parametryczne;
 * bez nich policzy się sama baza. `calcQuoteTotals` robi to za niego.
 */
export function calcSectionTotals(
  section: Section,
  options: Partial<TotalsOptions> = {},
): QuoteTotals {
  const merged = { ...DEFAULT_TOTALS_OPTIONS, ...options };
  return buildTotals(sumItems(sectionItems(section), merged.rooms), merged);
}

/** Podsumowanie pojedynczej grupy — do nagłówków w edytorze i PDF. */
export function calcGroupTotals(group: Group, options: Partial<TotalsOptions> = {}): QuoteTotals {
  const merged = { ...DEFAULT_TOTALS_OPTIONS, ...options };
  return buildTotals(sumItems(group.items, merged.rooms), merged);
}

/** Wszystkie pozycje sekcji: luźne + te w grupach. */
function sectionItems(section: Section): Item[] {
  return [...section.items, ...section.groups.flatMap((group) => group.items)];
}

/** Czy pomieszczenie liczy się do usługi o danym zasięgu. */
function roomInScope(room: Room, scope: RoomScope): boolean {
  if (scope === 'visual') return room.includedInVisual;
  if (scope === 'technical') return room.includedInTechnical;
  return true;
}

/** Cena za konkretne pomieszczenie; spoza słownika albo spoza mapy → domyślna. */
function perRoomPrice(
  room: Room,
  perRoomCents: Record<string, number>,
  defaultPerRoomCents: number,
): number {
  if (room.roomTypeId === null) return defaultPerRoomCents;
  return perRoomCents[room.roomTypeId] ?? defaultPerRoomCents;
}

/**
 * Wartość pozycji w groszach, wg jej reguły cenowej.
 *
 * ```
 * flat:      qty × cena jednostkowa
 * per_room:  qty × (baza + Σ po pomieszczeniach w zasięgu: cena_pom × ilość_pom)
 * per_frame: qty × ilość_pom × (cena_pom + baza × kadry)
 * ```
 *
 * `qty` pozycji mnoży wynik w każdym trybie — tak jak wszędzie indziej
 * w aplikacji. W arkuszu usługi parametryczne mają `qty = 1`, więc parytet
 * jest zachowany, a ustawienie `2` robi to, czego użytkownik się spodziewa.
 *
 * Zaokrąglamy **raz**, na końcu: `qty` bywa ułamkowe, a cena za pomieszczenie
 * całkowita, więc zaokrąglanie składników gubiłoby grosze.
 */
export function calcItemCents(item: Item, rooms: Room[] = []): number {
  const pricing = item.pricing;

  if (pricing.mode === 'per_room') {
    const perRoom = rooms
      .filter((room) => roomInScope(room, pricing.roomScope))
      .reduce(
        (sum, room) =>
          sum + perRoomPrice(room, pricing.perRoomCents, pricing.defaultPerRoomCents) * room.qty,
        0,
      );
    return roundCents(item.qty * (pricing.baseCents + perRoom));
  }

  if (pricing.mode === 'per_frame') {
    // Pozycja bez przypisanego pomieszczenia liczy się raz, po cenie domyślnej —
    // inaczej wizualizacja „luzem” cicho wypadłaby z wyceny.
    const room = rooms.find((candidate) => candidate.id === item.roomId) ?? null;
    const roomCents = room
      ? perRoomPrice(room, pricing.perRoomCents, pricing.defaultPerRoomCents)
      : pricing.defaultPerRoomCents;
    const frames = item.frames ?? 1;
    return roundCents(item.qty * (room?.qty ?? 1) * (roomCents + pricing.baseCents * frames));
  }

  // qty może być ułamkowe (np. 2,5 h) — zaokrąglamy dopiero wartość pozycji.
  return roundCents(item.qty * item.unitPriceCents);
}

/** Sumuje włączone pozycje, rozdzielając zwykłe pozycje od rabatów. */
function sumItems(
  items: Item[],
  rooms: Room[] = [],
): Pick<QuoteTotals, 'itemsCents' | 'discountsCents'> {
  let itemsCents = 0;
  let discountsCents = 0;

  for (const item of items) {
    if (!item.enabled) continue;
    const valueCents = calcItemCents(item, rooms);
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
