import { z } from 'zod';
import { CURRENT_BODY_VERSION, migrateBody } from './migrate';

/**
 * Model dokumentu wyceny (zod = jedno źródło typów i walidacji).
 * Struktura: Sekcje → Grupy (opcjonalne) → Pozycje. Pozycje mogą też leżeć
 * bezpośrednio w sekcji („luźne pozycje”).
 */

/** Status wyceny — parytet z `quotes.status` w bazie. */
/**
 * Statusy wyceny.
 *
 * `archived` (T-57) to **status**, a nie kosz: wersja przestała być aktualną
 * propozycją, ale dalej jest na liście projektu i w rejestrze. Kosz to
 * `deleted_at` i ma w UI własną nazwę („Usuń") — dwa różne „archiwa" byłyby
 * pułapką.
 */
export const QuoteStatusSchema = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'archived',
]);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

/**
 * Rodzaj dokumentu wyslanego inwestorowi (F7.1, arkusz `OFERTY` — RODZAJ).
 *
 * **Nie wyliczamy tego z zawartosci wyceny.** Wycena, ktora ma cennik
 * dodatkowy, nie jest „samym cennikiem" — o tym, co naprawde poszlo do
 * inwestora, wie tylko czlowiek.
 */
export const DocKindSchema = z.enum(['offer', 'schedule_only', 'price_list_only']);
export type DocKind = z.infer<typeof DocKindSchema>;

/** Rodzaj pozycji: zwykła pozycja albo rabat. */
export const ItemKindSchema = z.enum(['item', 'discount']);
export type ItemKind = z.infer<typeof ItemKindSchema>;

/** Czy ceny w wycenie są podane netto, czy brutto. */
export const PricesIncludeSchema = z.enum(['net', 'gross']);
export type PricesInclude = z.infer<typeof PricesIncludeSchema>;

/**
 * Który zestaw pomieszczeń liczy się do danej usługi. Odpowiednik dwóch kolumn
 * z arkusza: `M` („w projekcie”, wizualny) i `A` („w części technicznej”).
 * `all` znaczy „wszystkie pomieszczenia wyceny”, niezależnie od flag.
 */
export const RoomScopeSchema = z.enum(['visual', 'technical', 'all']);
export type RoomScope = z.infer<typeof RoomScopeSchema>;

/**
 * Pomieszczenie w wycenie. `label` jest własnością tej wyceny („salon
 * z jadalnią”), a `roomTypeId` wskazuje słownikowy typ, po którym cennik
 * znajduje cenę. `null` = pomieszczenie spoza słownika — wtedy liczy się
 * `defaultPerRoomCents`.
 */
export const RoomSchema = z.object({
  id: z.string().uuid(),
  roomTypeId: z.string().uuid().nullable().default(null),
  /** Patrz `PUSTA_NAZWA` niżej — pusta etykieta to dokument w trakcie pisania. */
  label: z.string().default(''),
  qty: z.number().int().positive().default(1),
  includedInVisual: z.boolean().default(true),
  includedInTechnical: z.boolean().default(true),
});
export type Room = z.infer<typeof RoomSchema>;

/**
 * Reguła wyceny pozycji. `flat` to dotychczasowe `qty × cena`; pozostałe dwa
 * tryby odwzorowują cennik parametryczny z arkusza (usługa = baza + składnik
 * za każde zaznaczone pomieszczenie).
 *
 * Wszystkie kwoty w groszach — zaokrąglenie dopiero przy wartości pozycji.
 */
/**
 * Jednostka ilości pozycji (T-60).
 *
 * Mieszka TUTAJ, a nie w `domain/library`, bo jest częścią `Item` — a `Item`
 * jest w tym pliku. Odwrotny układ dawał cykl importów (`quote/schema` ↔
 * `library/units`) i dwa różne typy o tej samej nazwie.
 */
export const UnitSchema = z.enum([
  'lump',
  'piece',
  'm2',
  'mb',
  'hour',
  'visit',
  'element',
  'frame',
  'custom',
]);
export type Unit = z.infer<typeof UnitSchema>;

export const PricingRuleSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('flat') }),
  z.object({
    mode: z.literal('per_room'),
    baseCents: z.number().int().default(0),
    /** Cena za pomieszczenie, po `roomTypeId`. Klucz spoza mapy → `defaultPerRoomCents`. */
    perRoomCents: z.record(z.string(), z.number().int()).default({}),
    defaultPerRoomCents: z.number().int().default(0),
    roomScope: RoomScopeSchema.default('all'),
  }),
  z.object({
    /** Wizualizacje: cena pomieszczenia + baza × liczba kadrów. */
    mode: z.literal('per_frame'),
    baseCents: z.number().int().default(0),
    perRoomCents: z.record(z.string(), z.number().int()).default({}),
    defaultPerRoomCents: z.number().int().default(0),
  }),
]);
export type PricingRule = z.infer<typeof PricingRuleSchema>;

export const ItemSchema = z.object({
  id: z.string().uuid(),
  kind: ItemKindSchema.default('item'),
  /**
   * PUSTA NAZWA JEST DOZWOLONA — i to jest decyzja, nie niedopatrzenie.
   *
   * Interfejs celowo ją obsługuje: pole ma placeholder „Nowa pozycja",
   * a etykiety czytników czytają `item.name || 'Nowa pozycja'`. Człowiek,
   * który kasuje nazwę, żeby wpisać ją od nowa, na ułamek sekundy ma
   * dokument z pustym polem — i autozapis go w tym stanie utrwala.
   *
   * Wymóg `min(1)` znaczył, że taki dokument **nie dawał się już otworzyć**:
   * walidacja odrzucała `body`, a edytor pokazywał „Wycena uszkodzona".
   * Odrzucamy zniekształcony KSZTAŁT dokumentu, a nie niedokończoną TREŚĆ —
   * od pilnowania treści jest interfejs, nie parser.
   */
  name: z.string().default(''),
  description: z.string().default(''),
  qty: z.number().positive().default(1),
  /**
   * Cena jednostkowa w groszach. Dla `discount` wartość jest dodatnia — calc
   * ją odejmuje.
   *
   * **`null` = „wycena indywidualna"** (T-60): pozycja jest w ofercie, ale nie
   * ma ceny i **nie wchodzi do sumy**. To nie to samo co zero — zero mówi
   * „gratis", `null` mówi „ustalimy osobno". Podsumowanie nie ma prawa udawać,
   * że taka pozycja kosztuje 0.
   *
   * Ta zmiana kształtu podniosła `bodyVersion` do 5.
   */
  unitPriceCents: z.number().int().nullable(),
  /**
   * Jednostka ilości — snapshot z biblioteki (T-60). Kaskaduje jak nazwa
   * i cena. `lump` (ryczałt) to domyślny przypadek i nie drukuje etykiety.
   */
  unit: UnitSchema.default('lump'),
  /** Własna nazwa jednostki — tylko dla `unit: 'custom'`. */
  unitLabel: z.string().optional(),
  enabled: z.boolean().default(true),
  libraryItemId: z.string().uuid().nullable().default(null),
  /** Reguła wyceny. Brak = `flat`, czyli zachowanie sprzed cennika parametrycznego. */
  pricing: PricingRuleSchema.default({ mode: 'flat' }),
  /** Pozycja przypięta do konkretnego pomieszczenia (bloki per-room, tryb `per_frame`). */
  roomId: z.string().uuid().nullable().default(null),
  /** Liczba kadrów — tylko dla `per_frame`. */
  frames: z.number().int().positive().optional(),
  /**
   * Etykiety pozycji (F2.3, używane też przy harmonogramie w F5).
   *
   * Luźna lista stringów, a nie enum: to są **notatki o charakterze pracy**
   * (`communication`, `meeting`), a nie wymiar, po którym cokolwiek się liczy.
   * Zamknięty zbiór wymuszałby migrację za każdym razem, gdy komuś przyda się
   * nowa etykieta — a nieznana etykieta nie ma prawa zepsuć dokumentu.
   */
  tags: z.array(z.string()).default([]),
});
export type Item = z.infer<typeof ItemSchema>;

export const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().default(''),
  items: z.array(ItemSchema).default([]),
  /**
   * Grupa reprezentująca **pomieszczenie** (bloki per-room z arkusza, wiersze
   * 22–92). `null` = zwykła grupa tematyczna.
   *
   * Blok pomieszczenia jest grupą, a nie osobnym bytem, świadomie: przeciąganie
   * (`dnd/drop-resolution.ts` zna tylko sekcje, grupy i pozycje), zapis zestawu
   * do biblioteki i kaskada działają wtedy bez dopisywania czwartego poziomu.
   * Nazwa takiej grupy pochodzi z `Room.label`, więc nie edytuje się jej tutaj.
   */
  roomId: z.string().uuid().nullable().default(null),
});
export type Group = z.infer<typeof GroupSchema>;

export const SectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().default(''),
  groups: z.array(GroupSchema).default([]),
  items: z.array(ItemSchema).default([]),
});
export type Section = z.infer<typeof SectionSchema>;

/** Na czym liczy się procent: cała wycena, jedna sekcja, wskazane pozycje. */
export const DiscountScopeSchema = z.enum(['quote', 'section', 'items']);
export type DiscountScope = z.infer<typeof DiscountScopeSchema>;

/**
 * Warunek naliczenia. `all_items_in_scope_enabled` to „rabat za kompletny etap”
 * z arkusza (K114): 5% należy się tylko wtedy, gdy klient bierze **wszystkie**
 * pozycje z zakresu.
 */
export const DiscountConditionSchema = z.enum(['always', 'all_items_in_scope_enabled']);
export type DiscountCondition = z.infer<typeof DiscountConditionSchema>;

/**
 * Rabat jako osobny byt, nie pozycja wyceny.
 *
 * W arkuszu rabaty też mają własną sekcję — a procent musi wiedzieć, **od
 * czego** liczy, czego pozycja z ceną jednostkową nie potrafi wyrazić.
 * Kwotowe rabaty z pozycji (`kind: 'discount'`) dalej działają; przeniesienie
 * ich tutaj razem z UI to T-36.
 */
export const DiscountSchema = z.object({
  id: z.string().uuid(),
  /** Jak przy `Item.name` — pusta nazwa to stan przejściowy, nie uszkodzenie. */
  name: z.string().default(''),
  description: z.string().default(''),
  enabled: z.boolean().default(true),
  type: z.enum(['fixed', 'percent']),
  /** Dla `fixed` — wartość dodatnia, calc ją odejmuje. */
  valueCents: z.number().int().nonnegative().optional(),
  /** Dla `percent` — 0–100. */
  percent: z.number().min(0).max(100).optional(),
  scope: DiscountScopeSchema.default('quote'),
  sectionId: z.string().uuid().nullable().default(null),
  itemIds: z.array(z.string().uuid()).default([]),
  condition: DiscountConditionSchema.default('always'),
  /**
   * Zaokrąglenie kwoty rabatu do wielokrotności groszy — odpowiednik
   * `MROUND(…; 10)` z arkusza (`1000` = pełne 10 zł). `0` = bez zaokrąglania.
   */
  roundToCents: z.number().int().nonnegative().default(0),
});
export type Discount = z.infer<typeof DiscountSchema>;

export const QuoteClientSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  /**
   * Miasto inwestora (F7.1, arkusz `OFERTY` — kolumna MIASTO).
   *
   * `default('')` znaczy, ze dokumenty sprzed T-49 czytaja sie dalej — nie
   * ma tu zmiany KSZTALTU, wiec `bodyVersion` nie idzie w gore. Kolumna
   * `quotes.city` to kopia tego pola, jak `client_name` dla nazwy.
   */
  city: z.string().default(''),
});
export type QuoteClient = z.infer<typeof QuoteClientSchema>;

/** Czym są liczby w cenniku: groszami czy minutami pracy (F2.1). */
export const PricingBasisSchema = z.enum(['amount', 'time']);
export type PricingBasis = z.infer<typeof PricingBasisSchema>;

export const QuoteBodySchema = z.object({
  /**
   * Wersja kształtu dokumentu. Dokument z bazy przechodzi przez `migrateBody`,
   * zanim tu trafi, więc tutaj może być już tylko wersja bieżąca — literał
   * zamiast luźnej liczby, żeby pominięcie migracji było błędem widocznym od
   * razu, a nie cichym zapisem okrojonego dokumentu.
   */
  bodyVersion: z.literal(CURRENT_BODY_VERSION).default(CURRENT_BODY_VERSION),
  title: z.string().default('Wycena'),
  subtitle: z.string().default(''),
  intro: z.string().default(''),
  projectDescription: z.string().default(''),
  client: QuoteClientSchema.default({}),
  /**
   * Data wystawienia (ISO `YYYY-MM-DD`). `null` = uzyj `quotes.created_at`.
   * Wycene przygotowuje sie nieraz z inna data niz dzien utworzenia rekordu,
   * dlatego pole jest edytowalne — tak jak w prototypie.
   */
  issueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi byc w formacie RRRR-MM-DD')
    .nullable()
    .default(null),
  validDays: z.number().int().nonnegative().default(7),
  /** Stawka VAT w procentach (0–100). Ograniczona, żeby calc nie dzielił przez zero. */
  vatRate: z.number().min(0).max(100).default(23),
  pricesInclude: PricesIncludeSchema.default('net'),
  /**
   * Czym są liczby w tym dokumencie (F2.1).
   *
   * `amount` — grosze. `time` — **minuty**; kwota powstaje dopiero z
   * przemnożenia przez stawkę. Tak działa arkusz (`SYSTEM PRACY`) i dzięki
   * temu biblioteka oraz macierz cennika obsługują oba tryby bez duplikowania
   * pól. Konwersja siedzi w jednym miejscu: `toCents()` w `calc.ts`.
   */
  pricingBasis: PricingBasisSchema.default('amount'),
  /**
   * Stawka godzinowa w groszach — **kopia** ustawienia workspace'u z chwili
   * utworzenia wyceny, a nie odwołanie do niego. Podniesienie cennika nie ma
   * prawa zmienić kwot w ofertach, które już poszły do klientów.
   */
  hourlyRateCents: z.number().int().positive().nullable().default(null),
  /** Pomieszczenia wyceny — wymiar, po którym liczy się cennik parametryczny. */
  rooms: z.array(RoomSchema).default([]),
  /** Rabaty procentowe i warunkowe. Kwotowe z pozycji (`kind`) działają nadal. */
  discounts: z.array(DiscountSchema).default([]),
  sections: z.array(SectionSchema).default([]),
  preparedBy: z.string().default(''),
  showDisabledItems: z.boolean().default(true),
});
export type QuoteBody = z.infer<typeof QuoteBodySchema>;

/** Wynik bezpiecznego parsowania `quotes.body` z bazy. */
export type ParseQuoteBodyResult = { ok: true; body: QuoteBody } | { ok: false; error: string };

/**
 * Bezpieczny parse dokumentu wyceny (używany przy odczycie z bazy).
 * Zamiast rzucać wyjątkiem zwraca opis błędu — repozytorium pokaże
 * „wycena uszkodzona”, zamiast wywalać aplikację.
 */
export function parseQuoteBody(input: unknown): ParseQuoteBodyResult {
  // Najpierw migracja, potem walidacja — schemat opisuje WYŁĄCZNIE bieżącą
  // wersję modelu, więc starszy dokument musi najpierw przyjąć jej kształt.
  // To jedyne wejście dla `quotes.body` i `templates.body`, więc oba
  // repozytoria dostają migrację stąd.
  const migrated = migrateBody(input);
  if (!migrated.ok) return { ok: false, error: migrated.error };

  const result = QuoteBodySchema.safeParse(migrated.body);
  if (result.success) {
    return { ok: true, body: result.data };
  }
  const error = result.error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path === '' ? issue.message : `${path}: ${issue.message}`;
    })
    .join('; ');
  return { ok: false, error };
}
