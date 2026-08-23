import { z } from 'zod';
import { DEFAULT_NUMBER_PATTERN } from '../numbering';
import { PricesIncludeSchema, PricingBasisSchema } from '../quote/schema';
import { ScheduleStageSchema } from '../schedule/schema';

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

export const BrandKitSchema = z.object({
  companyName: z.string().default(''),
  /** Ścieżka w Storage, np. `brand/{workspaceId}/logo-dark.png`. */
  logoDarkPath: z.string().nullable().default(null),
  logoLightPath: z.string().nullable().default(null),
  accentColor: HexColorSchema.default('#21201C'),
  bgColor: HexColorSchema.default('#FAF7F1'),
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
  scheduleTemplate: z.array(ScheduleStageSchema.omit({ id: true })).nullable().default(null),
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
