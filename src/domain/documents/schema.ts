import { z } from 'zod';

/**
 * Dokumenty towarzyszące wycenie (F6).
 *
 * **Nie są osobnymi bytami, tylko częściami wyceny.** Inwestor dostaje pakiet:
 * ofertę, termin, etapy współpracy i cennik dodatkowy — wszystkie z jednym
 * numerem, jednym klientem i jedną stopką. Osobne encje znaczyłyby
 * synchronizowanie tych trzech rzeczy między dokumentami, czyli pracę, która
 * zawsze gdzieś się rozjedzie.
 */

export const StageEntrySchema = z.object({
  id: z.string().uuid(),
  name: z.string().default(''),
  description: z.string().default(''),
  /**
   * Czy etap wchodzi do zakresu tej oferty.
   *
   * Etapy **nieobjęte zostają na liście** — z krzyżykiem zamiast ptaszka.
   * To jest sedno tego dokumentu: klient ma zobaczyć, czego NIE robimy,
   * zanim sam się tego domyśli w połowie projektu.
   */
  included: z.boolean().default(true),
  /** Nagłówek grupy, np. „ETAP FUNKCJONALNY". Pusty = etap ogólny. */
  sectionLabel: z.string().default(''),
  /** Etykiety pozycji, które proponują zaznaczenie tego etapu (jak w F5.2). */
  linkedItemTags: z.array(z.string()).default([]),
});
export type StageEntry = z.infer<typeof StageEntrySchema>;

export const StagesDocSchema = z.object({
  /** Ważność tego dokumentu — dłuższa niż oferty (arkusz: 14 dni). */
  validDays: z.number().int().nonnegative().default(14),
  entries: z.array(StageEntrySchema).default([]),
  /** Przypis pod tabelą — zastrzeżenia, uwagi o zakresie. */
  footnote: z.string().default(''),
});
export type StagesDoc = z.infer<typeof StagesDocSchema>;

export const QuoteDocumentsSchema = z.object({
  stages: StagesDocSchema.nullable().default(null),
});
export type QuoteDocuments = z.infer<typeof QuoteDocumentsSchema>;

/**
 * Parsowanie `quotes.documents` z bazy.
 *
 * Miękko, jak `pricing` w bibliotece i `schedule` w wycenie: dokument zapisany
 * nowszą wersją aplikacji albo ręcznie zepsuty nie ma prawa zablokować całej
 * oferty. `null` znaczy „ta wycena nie ma dokumentów dodatkowych" i jest
 * w pełni poprawnym stanem.
 */
export function parseQuoteDocuments(raw: unknown): QuoteDocuments | null {
  if (raw === null || raw === undefined) return null;
  const parsed = QuoteDocumentsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
