import { z } from 'zod';
import { PRICING_CHOICES } from '../library/units';

/**
 * Asystent AI — schematy odpowiedzi modelu (FEATURES-AI.md §1.3).
 *
 * ## Dlaczego schemat jest po NASZEJ stronie, a nie „co model zwróci"
 *
 * Model dostaje ten sam schemat jako `output_config.format` (funkcja brzegowa
 * `ai`), więc teoretycznie zawsze trafia. Walidujemy mimo to: odpowiedź jedzie
 * przez sieć i przez Deno, a w domenie chcemy mieć gwarancję kształtu, a nie
 * nadzieję. `safeParse` na granicy (`ai.repo`) zamienia każdą niespodziankę
 * w czytelny błąd zamiast w wyjątek w komponencie.
 *
 * ## Kopia w Deno
 *
 * `supabase/functions/ai/schemas.ts` ma te same schematy bez `.default()`
 * (format wyjścia modelu nie zna domyślnych). Rozjazd pilnuje
 * `edge-parity.test.ts` — ten sam układ co `domain/billing` ↔
 * `_shared/subscription-status.ts`.
 */

export const AI_ACTIONS = [
  'import-library',
  'brief-to-quote',
  'comments-to-changes',
  'polish-text',
] as const;
export type AiAction = (typeof AI_ACTIONS)[number];

export const AI_ERROR_CODES = [
  'unauthorized',
  'read_only',
  'limit_reached',
  'refused',
  'invalid_output',
  'upstream',
  'bad_request',
  'network',
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

export const AiUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
});
export type AiUsage = z.infer<typeof AiUsageSchema>;

/** Stan limitu — odpowiedź akcji `usage` i treść błędu `limit_reached`. */
export const AiQuotaSchema = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  /** ISO — pierwszy dzień następnego miesiąca (UTC). */
  resetsAt: z.string(),
});
export type AiQuota = z.infer<typeof AiQuotaSchema>;

export const AiConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type AiConfidence = z.infer<typeof AiConfidenceSchema>;

const PRICING_CHOICE_IDS = PRICING_CHOICES.map((choice) => choice.id) as [
  (typeof PRICING_CHOICES)[number]['id'],
  ...(typeof PRICING_CHOICES)[number]['id'][],
];
export const PricingChoiceIdSchema = z.enum(PRICING_CHOICE_IDS);

// ---------------------------------------------------------------------------
// T-136 import biblioteki
// ---------------------------------------------------------------------------

export const LibraryImportItemSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().default(''),
  /** Istniejąca grupa (dokładna nazwa) albo nowa; `null` = bez grupy. */
  categoryName: z.string().nullable().default(null),
  pricingChoice: PricingChoiceIdSchema.default('flat_lump'),
  /** Tylko przy `flat_custom`. */
  unitLabel: z.string().nullable().default(null),
  /** Grosze. `null` = brak ceny w dokumencie albo „indywidualnie". */
  unitPriceCents: z.number().int().nonnegative().nullable().default(null),
  /** „od …" — informacja, nie reguła liczenia. */
  minPriceCents: z.number().int().nonnegative().nullable().default(null),
  confidence: AiConfidenceSchema.default('medium'),
  /** Skąd wiersz („wiersz 14", „tabela 2") — do podglądu, nie do zapisu. */
  sourceNote: z.string().default(''),
});
export type LibraryImportItem = z.infer<typeof LibraryImportItemSchema>;

export const LibraryImportProposalSchema = z.object({
  items: z.array(LibraryImportItemSchema).default([]),
  newCategories: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type LibraryImportProposal = z.infer<typeof LibraryImportProposalSchema>;

// ---------------------------------------------------------------------------
// T-137 brief → wycena
// ---------------------------------------------------------------------------

export const BriefProposalRoomSchema = z.object({
  roomTypeId: z.string().nullable().default(null),
  label: z.string().min(1),
  qty: z.number().int().positive().default(1),
});
export type BriefProposalRoom = z.infer<typeof BriefProposalRoomSchema>;

export const BriefProposalItemSchema = z.object({
  libraryItemId: z.string().min(1),
  enabled: z.boolean().default(true),
  reason: z.string().default(''),
});
export type BriefProposalItem = z.infer<typeof BriefProposalItemSchema>;

export const BriefProposalSchema = z.object({
  title: z.string().default(''),
  projectDescription: z.string().default(''),
  templateId: z.string().nullable().default(null),
  rooms: z.array(BriefProposalRoomSchema).default([]),
  items: z.array(BriefProposalItemSchema).default([]),
  openQuestions: z.array(z.string()).default([]),
});
export type BriefProposal = z.infer<typeof BriefProposalSchema>;

// ---------------------------------------------------------------------------
// T-138 uwagi → zmiany
// ---------------------------------------------------------------------------

export const CommentChangeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('disable'),
    itemId: z.string().min(1),
    reason: z.string().default(''),
  }),
  z.object({
    kind: z.literal('enable'),
    itemId: z.string().min(1),
    reason: z.string().default(''),
  }),
  z.object({
    kind: z.literal('remove'),
    itemId: z.string().min(1),
    reason: z.string().default(''),
  }),
  z.object({
    kind: z.literal('add'),
    libraryItemId: z.string().min(1),
    sectionId: z.string().min(1),
    reason: z.string().default(''),
  }),
  z.object({
    kind: z.literal('qty'),
    itemId: z.string().min(1),
    qty: z.number().positive(),
    reason: z.string().default(''),
  }),
]);
export type CommentChange = z.infer<typeof CommentChangeSchema>;

export const CommentChangesSchema = z.object({
  summary: z.string().default(''),
  changes: z.array(CommentChangeSchema).default([]),
  /** Fragmenty uwag bez przełożenia na pozycje („za drogo"). */
  unresolved: z.array(z.string()).default([]),
});
export type CommentChanges = z.infer<typeof CommentChangesSchema>;

// ---------------------------------------------------------------------------
// T-139 teksty
// ---------------------------------------------------------------------------

export const PolishFieldSchema = z.enum(['intro', 'projectDescription', 'itemDescription']);
export type PolishField = z.infer<typeof PolishFieldSchema>;

export const PolishedTextSchema = z.object({
  text: z.string(),
  placeholdersKept: z.boolean().default(true),
});
export type PolishedText = z.infer<typeof PolishedTextSchema>;

// ---------------------------------------------------------------------------
// Mapowanie akcja → schemat odpowiedzi
// ---------------------------------------------------------------------------

export const AI_RESULT_SCHEMAS = {
  'import-library': LibraryImportProposalSchema,
  'brief-to-quote': BriefProposalSchema,
  'comments-to-changes': CommentChangesSchema,
  'polish-text': PolishedTextSchema,
} as const satisfies Record<AiAction, z.ZodTypeAny>;

export type AiResultOf<A extends AiAction> = z.infer<(typeof AI_RESULT_SCHEMAS)[A]>;
