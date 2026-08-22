import { z } from 'zod';

/**
 * Model dokumentu wyceny (zod = jedno źródło typów i walidacji).
 * Struktura: Sekcje → Grupy (opcjonalne) → Pozycje. Pozycje mogą też leżeć
 * bezpośrednio w sekcji („luźne pozycje”).
 */

/** Status wyceny — parytet z `quotes.status` w bazie. */
export const QuoteStatusSchema = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

/** Rodzaj pozycji: zwykła pozycja albo rabat. */
export const ItemKindSchema = z.enum(['item', 'discount']);
export type ItemKind = z.infer<typeof ItemKindSchema>;

/** Czy ceny w wycenie są podane netto, czy brutto. */
export const PricesIncludeSchema = z.enum(['net', 'gross']);
export type PricesInclude = z.infer<typeof PricesIncludeSchema>;

export const ItemSchema = z.object({
  id: z.string().uuid(),
  kind: ItemKindSchema.default('item'),
  name: z.string().min(1),
  description: z.string().default(''),
  qty: z.number().positive().default(1),
  /** Cena jednostkowa w groszach. Dla `discount` wartość jest dodatnia — calc ją odejmuje. */
  unitPriceCents: z.number().int(),
  enabled: z.boolean().default(true),
  libraryItemId: z.string().uuid().nullable().default(null),
});
export type Item = z.infer<typeof ItemSchema>;

export const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().default(''),
  items: z.array(ItemSchema).default([]),
});
export type Group = z.infer<typeof GroupSchema>;

export const SectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().default(''),
  groups: z.array(GroupSchema).default([]),
  items: z.array(ItemSchema).default([]),
});
export type Section = z.infer<typeof SectionSchema>;

export const QuoteClientSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
});
export type QuoteClient = z.infer<typeof QuoteClientSchema>;

export const QuoteBodySchema = z.object({
  title: z.string().default('Wycena'),
  subtitle: z.string().default(''),
  intro: z.string().default(''),
  projectDescription: z.string().default(''),
  client: QuoteClientSchema.default({}),
  validDays: z.number().int().nonnegative().default(7),
  /** Stawka VAT w procentach (0–100). Ograniczona, żeby calc nie dzielił przez zero. */
  vatRate: z.number().min(0).max(100).default(23),
  pricesInclude: PricesIncludeSchema.default('net'),
  sections: z.array(SectionSchema).default([]),
  preparedBy: z.string().default(''),
  showDisabledItems: z.boolean().default(true),
});
export type QuoteBody = z.infer<typeof QuoteBodySchema>;

/** Wynik bezpiecznego parsowania `quotes.body` z bazy. */
export type ParseQuoteBodyResult =
  | { ok: true; body: QuoteBody }
  | { ok: false; error: string };

/**
 * Bezpieczny parse dokumentu wyceny (używany przy odczycie z bazy).
 * Zamiast rzucać wyjątkiem zwraca opis błędu — repozytorium pokaże
 * „wycena uszkodzona”, zamiast wywalać aplikację.
 */
export function parseQuoteBody(input: unknown): ParseQuoteBodyResult {
  const result = QuoteBodySchema.safeParse(input);
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
