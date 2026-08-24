import { roundCents } from '../money';
import { calcDiscounts } from './discounts';
import type {
  Group,
  Item,
  PricesInclude,
  PricingBasis,
  QuoteBody,
  Room,
  RoomScope,
  Section,
} from './schema';

/** Minut w godzinie — stawka jest godzinowa, a liczby w dokumencie minutowe. */
const MINUTES_PER_HOUR = 60;

/**
 * Tryb liczenia dokumentu (F2.1).
 *
 * Wydzielony z `QuoteBody`, żeby funkcje liczące dało się wołać także dla
 * fragmentu (sekcja, grupa), gdzie całego dokumentu nie ma pod ręką.
 */
export interface PricingContext {
  pricingBasis: PricingBasis;
  /** Stawka w groszach za godzinę. `null` w trybie `time` = nie ma z czego liczyć. */
  hourlyRateCents: number | null;
}

/** Tryb kwotowy — liczby w dokumencie SĄ groszami. */
export const AMOUNT_BASIS: PricingContext = { pricingBasis: 'amount', hourlyRateCents: null };

/** Wyciąga tryb z dokumentu. */
export function pricingContextOf(body: QuoteBody): PricingContext {
  return { pricingBasis: body.pricingBasis, hourlyRateCents: body.hourlyRateCents };
}

/**
 * Zamienia „jednostki dokumentu" na grosze.
 *
 * W trybie kwotowym to tożsamość. W godzinowym liczby są **minutami**, więc
 * kwota powstaje dopiero tutaj: `minuty / 60 × stawka`. Dzielimy na poziomie
 * wartości pozycji, a nie każdej minuty z osobna — inaczej zaokrąglenia
 * zbierałyby się po kilka groszy na wiersz.
 *
 * **Brak stawki w trybie godzinowym daje 0, a nie wyjątek.** Wycena bez
 * ustawionej stawki jest niedokończona, ale ma się dalej otwierać i dawać
 * poprawić — rzucenie błędu z funkcji liczącej zamieniłoby brakujące pole
 * w biały ekran.
 */
export function toCents(units: number, context: PricingContext): number {
  if (context.pricingBasis === 'amount') return units;
  if (!context.hourlyRateCents) return 0;
  return roundCents((units / MINUTES_PER_HOUR) * context.hourlyRateCents);
}

/** Odwrotność `toCents` — ile minut pracy odpowiada kwocie przy danej stawce. */
export function toMinutes(cents: number, context: PricingContext): number {
  if (context.pricingBasis === 'amount') return 0;
  if (!context.hourlyRateCents) return 0;
  return Math.round((cents / context.hourlyRateCents) * MINUTES_PER_HOUR);
}

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
  /** Tryb liczenia (F2.1). Domyślnie kwotowy — liczby SĄ groszami. */
  pricing: PricingContext;
}

/**
 * Domyślnie fragmenty (grupa/sekcja) liczymy bez VAT-u — UI pokazuje przy nich
 * sumę „jak wpisano”. Pełny kontekst przekazuje `calcQuoteTotals`.
 */
const DEFAULT_TOTALS_OPTIONS: TotalsOptions = {
  vatRate: 0,
  pricesInclude: 'net',
  rooms: [],
  pricing: AMOUNT_BASIS,
};

/** Podsumowanie jednej sekcji na potrzeby rozbicia „per etap". */
export interface SectionTotal {
  sectionId: string;
  title: string;
  itemsCents: number;
  /** Rabaty, które da się jednoznacznie przypisać do tej sekcji. */
  discountsCents: number;
  netCents: number;
}

/**
 * Rozbicie wyceny na sekcje (arkusz: `OFERTA - DANE` R50–R54).
 *
 * Do sekcji przypisujemy rabat wtedy i tylko wtedy, gdy **na pewno** do niej
 * należy: `scope: 'section'` wskazujący tę sekcję albo `scope: 'items'`,
 * którego wszystkie pozycje w niej leżą. Rabatu na całą wycenę nie rozdzielamy
 * — rozsmarowanie go proporcjonalnie dałoby liczby, których nie da się
 * odtworzyć ręcznie, a to podsumowanie ma służyć do sprawdzania.
 */
export function calcSectionBreakdown(body: QuoteBody): SectionTotal[] {
  const { lines } = calcDiscounts(body, body.rooms);
  const byId = new Map(body.discounts.map((discount) => [discount.id, discount]));

  return body.sections.map((section) => {
    const items = sectionItems(section);
    const ids = new Set(items.map((item) => item.id));
    const sums = sumItems(items, body.rooms, pricingContextOf(body));

    const discountsCents = lines.reduce((total, line) => {
      const discount = byId.get(line.discountId);
      if (!discount) return total;

      if (discount.scope === 'section') {
        return discount.sectionId === section.id ? total + line.amountCents : total;
      }

      if (discount.scope === 'items') {
        const wszystkieTutaj =
          discount.itemIds.length > 0 && discount.itemIds.every((id) => ids.has(id));
        return wszystkieTutaj ? total + line.amountCents : total;
      }

      return total;
    }, 0);

    return {
      sectionId: section.id,
      title: section.title,
      itemsCents: sums.itemsCents,
      discountsCents: sums.discountsCents + discountsCents,
      netCents: Math.max(0, sums.itemsCents - sums.discountsCents - discountsCents),
    };
  });
}

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
  const sums = sumItems(body.sections.flatMap(sectionItems), body.rooms, pricingContextOf(body));
  const discounts = calcDiscounts(body, body.rooms);

  return buildTotals(
    { ...sums, discountsCents: sums.discountsCents + discounts.totalCents },
    {
      vatRate: body.vatRate,
      pricesInclude: body.pricesInclude,
      rooms: body.rooms,
      pricing: pricingContextOf(body),
    },
  );
}

/** Etykieta pozycji oznaczająca komunikację projektową (F2.3). */
export const TAG_COMMUNICATION = 'communication';

/** Pracochłonność dokumentu w minutach (F2.1, F2.3). */
export interface Workload {
  minutesTotal: number;
  minutesBySection: { sectionId: string; title: string; minutes: number }[];
  /**
   * Ile z tych minut przypada na pozycje oznaczone jako komunikacja projektowa.
   * **Wliczone w `minutesTotal`** — to wyodrębnienie, nie osobna pula.
   */
  communicationMinutes: number;
  /**
   * Czy liczby w ogóle udało się policzyć.
   *
   * W trybie kwotowym potrzebna jest stawka; bez niej `false` i same zera.
   * Rozróżnienie „zero minut" od „nie wiem" jest tu istotne: interfejs ma
   * powiedzieć, czego brakuje, zamiast pokazywać zero jak wynik.
   */
  available: boolean;
}

const BRAK_PRACOCHLONNOSCI: Workload = {
  minutesTotal: 0,
  minutesBySection: [],
  communicationMinutes: 0,
  available: false,
};

/**
 * Pracochłonność wyceny w minutach.
 *
 * Działa w obie strony, bo arkusz też tak robi:
 *
 *  - **tryb godzinowy** — minuty to wprost to, co wpisano. Liczymy z surowych
 *    jednostek, a nie z groszy przez `toMinutes`: droga w tę i z powrotem
 *    przez stawkę gubi resztę przy zaokrągleniu.
 *  - **tryb kwotowy** (F2.3, wariant odwrotny) — szacujemy `kwota / stawka × 60`.
 *    Stawki nie ma wtedy w dokumencie, bo wycena kwotowa jej nie potrzebuje,
 *    więc podaje ją wołający — zwykle z ustawień workspace'u.
 *
 * **Bez stawki w trybie kwotowym zwracamy `available: false`, a nie zera.**
 * Zero minut pracy to konkretna informacja i nie wolno jej mylić z brakiem
 * danych do wyliczenia.
 *
 * Świadome odstępstwo od `FEATURES §F2.1`, gdzie te liczby miały siedzieć
 * w `calcQuoteTotals`: osobna funkcja nie zmusza wszystkich odbiorców
 * podsumowania do obsługi pól, które w trybie kwotowym zwykle są puste.
 */
export function calcWorkload(body: QuoteBody, fallbackRateCents: number | null = null): Workload {
  const godzinowa = body.pricingBasis === 'time';
  const rate = godzinowa ? body.hourlyRateCents : fallbackRateCents;

  // W trybie godzinowym minuty znamy wprost — stawka nie jest do tego potrzebna.
  if (!godzinowa && !rate) return BRAK_PRACOCHLONNOSCI;

  const minutesOf = (item: Item): number => {
    const units = calcItemUnits(item, body.rooms);
    return godzinowa ? units : Math.round((units / (rate ?? 1)) * MINUTES_PER_HOUR);
  };

  /** Pozycje, które faktycznie oznaczają pracę: włączone i niebędące rabatem. */
  const liczone = (section: Section) =>
    sectionItems(section).filter((item) => item.enabled && item.kind !== 'discount');

  const minutesBySection = body.sections.map((section) => ({
    sectionId: section.id,
    title: section.title,
    minutes: liczone(section).reduce((sum, item) => sum + minutesOf(item), 0),
  }));

  const communicationMinutes = body.sections
    .flatMap(liczone)
    .filter((item) => item.tags.includes(TAG_COMMUNICATION))
    .reduce((sum, item) => sum + minutesOf(item), 0);

  return {
    minutesTotal: minutesBySection.reduce((sum, row) => sum + row.minutes, 0),
    minutesBySection,
    communicationMinutes,
    available: true,
  };
}

/**
 * Podsumowanie sekcji (razem z jej grupami) — do nagłówków w edytorze i PDF.
 *
 * Wołający musi podać `rooms`, jeśli sekcja zawiera pozycje parametryczne;
 * bez nich policzy się sama baza. `calcQuoteTotals` robi to za niego.
 *
 * **Tryb jest osobnym, wymaganym argumentem**, a nie polem w opcjach z
 * wartością domyślną. Opcje są częściowe, więc pominięty tryb wpadłby cicho
 * w „kwotowy" i nagłówek sekcji w wycenie godzinowej pokazywałby minuty jako
 * grosze. Osobny argument zmusza wołającego do odpowiedzi.
 */
export function calcSectionTotals(
  section: Section,
  pricing: PricingContext,
  options: Partial<Omit<TotalsOptions, 'pricing'>> = {},
): QuoteTotals {
  const merged = { ...DEFAULT_TOTALS_OPTIONS, ...options, pricing };
  return buildTotals(sumItems(sectionItems(section), merged.rooms, pricing), merged);
}

/** Podsumowanie pojedynczej grupy — do nagłówków w edytorze i PDF. */
export function calcGroupTotals(
  group: Group,
  pricing: PricingContext,
  options: Partial<Omit<TotalsOptions, 'pricing'>> = {},
): QuoteTotals {
  const merged = { ...DEFAULT_TOTALS_OPTIONS, ...options, pricing };
  return buildTotals(sumItems(group.items, merged.rooms, pricing), merged);
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
export function calcItemUnits(item: Item, rooms: Room[] = []): number {
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

  /*
   * Cena `null` = „wycena indywidualna" (T-60): pozycja jest w ofercie, ale
   * NIE wchodzi do sumy. Zwracamy zero, bo suma musi być liczbą — natomiast
   * podsumowanie i wiersz mówią o niej wprost („+ N pozycji wycenianych
   * indywidualnie"), zamiast udawać, że kosztuje 0 zł.
   */
  if (item.unitPriceCents === null) return 0;

  // qty może być ułamkowe (np. 2,5 h) — zaokrąglamy dopiero wartość pozycji.
  return roundCents(item.qty * item.unitPriceCents);
}

/**
 * Wartość pozycji w GROSZACH.
 *
 * Tryb jest argumentem **wymaganym**, choć w większości wywołań będzie to
 * `AMOUNT_BASIS`. To celowe: w trybie godzinowym te same liczby znaczą minuty,
 * więc każde miejsce pokazujące kwotę musi jawnie powiedzieć, co liczy.
 * Domyślna wartość przepuszczałaby po cichu wycenę godzinową liczoną jak
 * kwotowa — 45 minut wyszłoby jako 45 groszy.
 *
 * Zaokrąglamy **na poziomie pozycji**, a nie na końcu sumowania: kwoty
 * wierszy muszą się dodawać do pokazanej sumy. Klient, który zsumuje kolumnę
 * i dostanie inną liczbę niż w podsumowaniu, ma prawo stracić zaufanie do
 * całej oferty. Arkusz tego nie robi i przy stawkach niepodzielnych przez 60
 * potrafi się z nami rozejść o grosze — jest na to jawny test.
 */
export function calcItemCents(item: Item, rooms: Room[], context: PricingContext): number {
  return toCents(calcItemUnits(item, rooms), context);
}

/** Sumuje włączone pozycje, rozdzielając zwykłe pozycje od rabatów. */
function sumItems(
  items: Item[],
  rooms: Room[],
  context: PricingContext,
): Pick<QuoteTotals, 'itemsCents' | 'discountsCents'> {
  let itemsCents = 0;
  let discountsCents = 0;

  for (const item of items) {
    if (!item.enabled) continue;
    const valueCents = calcItemCents(item, rooms, context);
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
