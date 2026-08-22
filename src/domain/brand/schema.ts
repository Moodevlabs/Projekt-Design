import { z } from 'zod';
import { DEFAULT_NUMBER_PATTERN } from '../numbering';
import { PricesIncludeSchema } from '../quote/schema';

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
});
export type BrandKit = z.infer<typeof BrandKitSchema>;

/** Ustawienia workspace zapisywane w `workspaces.settings` (jsonb). */
export const WorkspaceSettingsSchema = z.object({
  currency: z.string().length(3).default('PLN'),
  vatRate: z.number().min(0).max(100).default(23),
  numberPattern: z.string().min(1).default(DEFAULT_NUMBER_PATTERN),
  showDisabledItems: z.boolean().default(true),
  pricesInclude: PricesIncludeSchema.default('net'),
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
