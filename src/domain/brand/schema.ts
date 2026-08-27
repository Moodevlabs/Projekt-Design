import { z } from 'zod';
import { DEFAULT_NUMBER_PATTERN } from '../numbering';
import { PricesIncludeSchema, PricingBasisSchema } from '../quote/schema';
import { ScheduleStageSchema } from '../schedule/schema';
import { StageEntrySchema } from '../documents/schema';
import { PriceListItemSchema } from '../documents/price-list';

/**
 * Brand kit i ustawienia workspace — parytet z tabelą `brand_kits`
 * oraz kolumną `workspaces.settings` (docs/02-DATABASE.md §1).
 */

/** Fonty wbudowane w PDF (docs/00-PRD.md §4.1). */
export const FontFamilySchema = z.enum(['Lato', 'Inter', 'Playfair', 'DM Sans', 'Source Serif']);
export type FontFamily = z.infer<typeof FontFamilySchema>;

/** Kolor w zapisie `#RRGGBB` — inne formaty odrzucamy, PDF ich nie obsłuży. */
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Kolor musi być w formacie #RRGGBB');
export type HexColor = z.infer<typeof HexColorSchema>;

export const BrandContactSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
});
export type BrandContact = z.infer<typeof BrandContactSchema>;

/**
 * Wiersz stopki „CZYNNE" — etykieta i godziny jako **tekst**, nie godziny
 * maszynowe. W arkuszu klienta stoi tam „poniedziałek – piątek / 8.00 – 16.00"
 * i „sobota (tylko spotkania) / 10.00 – 13.00”; parsowanie tego na model
 * czasowy nic by nie dało, a odebrałoby możliwość dopisania uwagi w nawiasie.
 */
export const OpeningHoursRowSchema = z.object({
  label: z.string().default(''),
  hours: z.string().default(''),
});
export type OpeningHoursRow = z.infer<typeof OpeningHoursRowSchema>;

/** Stopka mieści maksymalnie cztery wiersze godzin — dalej rozjeżdża się layout PDF. */
export const MAX_OPENING_HOURS_ROWS = 4;

/**
 * Wariant logo na pasie nagłówka PDF.
 *
 * `auto` liczy kontrast z koloru nagłówka; `light` i `dark` to decyzja
 * użytkownika, która tę regułę wyłącza. Nazwy opisują SAM PLIK, nie tło:
 * `light` to jasny znak (na ciemny pas), `dark` — ciemny (na jasny pas).
 */
export const HeaderLogoSchema = z.enum(['auto', 'light', 'dark']);
export type HeaderLogoChoice = z.infer<typeof HeaderLogoSchema>;

export const BrandKitSchema = z.object({
  companyName: z.string().default(''),
  /** Ścieżka w Storage, np. `brand/{workspaceId}/logo-dark.png`. */
  logoDarkPath: z.string().nullable().default(null),
  logoLightPath: z.string().nullable().default(null),
  /**
   * Który wariant logo kłaść na pasie nagłówka PDF (poprawka 3, 2026-08-27).
   *
   * `auto` = dotychczasowa reguła kontrastu: jasny nagłówek bierze ciemne logo,
   * ciemny — jasne. Zostaje domyślną, bo w większości przypadków jest po prostu
   * poprawna. Wartości `light` / `dark` są dla znaków, które mają własne tło
   * albo istnieją w jednej wersji i mają wyglądać zawsze tak samo.
   */
  headerLogo: HeaderLogoSchema.default('auto'),
  // Parytet z `0024_brand_defaults_toolier.sql`. Dotyczy TYLKO nowych
  // workspace'ów — istniejące mają własne wartości w wierszu i nic ich
  // nie nadpisuje (08-REDESIGN D-4: kolor oferty jest własnością klienta).
  accentColor: HexColorSchema.default('#33251E'),
  bgColor: HexColorSchema.default('#EFECE8'),
  fontFamily: FontFamilySchema.default('Lato'),
  contacts: z.array(BrandContactSchema).default([]),
  address: z.string().nullable().default(null),
  taxId: z.string().nullable().default(null),
  footerText: z.string().nullable().default(null),
  defaultIntro: z.string().nullable().default(null),
  defaultValidDays: z.number().int().nonnegative().default(7),
  /** Stopka „CZYNNE" (F7.2). Pusta lista = blok w PDF się nie drukuje. */
  openingHours: z.array(OpeningHoursRowSchema).max(MAX_OPENING_HOURS_ROWS).default([]),
  signerName: z.string().nullable().default(null),
  /** Tytuł zawodowy pod podpisem, np. „projektant wnętrz". */
  signerTitle: z.string().nullable().default(null),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;

/** Ustawienia workspace zapisywane w `workspaces.settings` (jsonb). */
export const WorkspaceSettingsSchema = z.object({
  currency: z.string().length(3).default('PLN'),
  vatRate: z.number().min(0).max(100).default(23),
  numberPattern: z.string().min(1).default(DEFAULT_NUMBER_PATTERN),
  showDisabledItems: z.boolean().default(true),
  /**
   * Czy numer wersji ma trafiać na dokument klienta (T-57).
   *
   * Domyślnie **nie**: inwestor nie musi wiedzieć, że to trzecie podejście.
   * W nazwie pliku wersja jest zawsze — tam chodzi o to, żeby pliki się nie
   * nadpisywały, a nie o to, co widzi klient.
   */
  showVersionOnPdf: z.boolean().default(false),
  pricesInclude: PricesIncludeSchema.default('net'),
  /**
   * Stawka godzinowa w groszach (F2.1) — **wzorzec** dla nowych wycen.
   *
   * Wycena bierze z niej kopię w chwili utworzenia (`body.hourlyRateCents`),
   * więc podniesienie cennika tutaj nie rusza ofert, które już poszły.
   */
  hourlyRateCents: z.number().int().positive().nullable().default(null),
  /** Czy nowa wycena startuje jako kwotowa, czy godzinowa. */
  defaultPricingBasis: PricingBasisSchema.default('amount'),
  /**
   * Własny szablon etapów harmonogramu (F5.1).
   *
   * `null` = używamy szablonu wbudowanego. Trzymamy etapy **bez `id`**: to jest
   * wzorzec, a nie harmonogram — identyfikatory powstają dopiero przy zakładaniu
   * go w konkretnej wycenie. Wspólne `id` znaczyłoby, że edycja jednego
   * dokumentu rusza drugi.
   */
  scheduleTemplate: z
    .array(ScheduleStageSchema.omit({ id: true }))
    .nullable()
    .default(null),
  /**
   * Wlasny szablon etapow wspolpracy (F6.1). `null` = szablon wbudowany.
   *
   * Trzymamy go w `settings`, a nie w osobnej tabeli `workspace_doc_templates`
   * z `FEATURES`: mamy juz jeden mechanizm szablonu workspace'u
   * (`scheduleTemplate`) i drugi, rownolegly, znaczylby dwa miejsca do
   * pilnowania. Tabela z NAZWANYMI szablonami ma sens dopiero wtedy, gdy ktos
   * naprawde potrzebuje kilku zestawow do wyboru.
   */
  stagesTemplate: z
    .array(StageEntrySchema.omit({ id: true }))
    .nullable()
    .default(null),
  /** Wlasny cennik uslug dodatkowych (F6.2). `null` = cennik wbudowany. */
  priceListTemplate: z
    .array(PriceListItemSchema.omit({ id: true }))
    .nullable()
    .default(null),
  /**
   * Zdjęcie użytkownika w pasku nawigacji (poprawka 4, 2026-08-27).
   *
   * Ścieżka w buckecie `brand`, jak logo. W `settings`, a nie w osobnej
   * kolumnie czy tabeli profili, bo Toolier jest narzędziem jednoosobowym
   * (decyzja z T-27): workspace ma dokładnie jednego użytkownika, więc
   * „avatar workspace'u" i „avatar użytkownika" to ta sama rzecz.
   */
  avatarPath: z.string().nullable().default(null),
  /**
   * Do kiedy pasek „Co nowego u klientów" jest odhaczony (2026-08-27).
   *
   * Zdarzenia starsze niż ten znacznik **nie znikają** — przestają się tylko
   * pokazywać domyślnie. To jest różnica między „wyczyść" a „skasuj":
   * akceptacja oferty jest faktem i nie ma prawa zniknąć dlatego, że ktoś
   * kliknął przycisk. Stąd też odsłonięcie ich z powrotem jednym kliknięciem.
   *
   * W `settings`, a nie w localStorage: odhaczenie zrobione na laptopie ma
   * obowiązywać także na drugim komputerze — inaczej ten sam komunikat wraca
   * przy każdej zmianie maszyny.
   */
  activitySeenAt: z.string().nullable().default(null),
});
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

/** Brand kit z wartościami domyślnymi (jak `default` w migracji). */
export function defaultBrandKit(): BrandKit {
  return BrandKitSchema.parse({});
}

/** Ustawienia workspace z wartościami domyślnymi. */
export function defaultWorkspaceSettings(): WorkspaceSettings {
  return WorkspaceSettingsSchema.parse({});
}
