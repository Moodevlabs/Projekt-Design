import { z } from 'zod';
import { PRICING_CHOICES } from '../library/units';
import { ProjectKindSchema } from '../project/schema';

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
  'message-to-project',
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
  /** Klient przerwał oczekiwanie (`AI_TIMEOUT_MS` w `ai.repo`) — model nie zdążył. */
  'timeout',
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
// Tolerancja na drobne odchylenia modelu
//
// Format wyjścia w Deno nie zna ograniczeń liczbowych ani długości (JSON
// Schema dla modelu to same typy), więc model może oddać nazwę na 170 znaków,
// ujemną kwotę albo pomieszczenie bez etykiety. Odrzucenie CAŁEJ odpowiedzi
// z tego powodu kosztowałoby użytkownika wywołanie z puli i pokazało „zły
// kształt" tam, gdzie 39 z 40 wierszy było dobrych. Dlatego pola są
// normalizowane (przycięcie, zaokrąglenie, `null` zamiast ujemnej), a wiersze,
// których nie da się uratować, odpadają pojedynczo.
// ---------------------------------------------------------------------------

const clampedText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().slice(0, max) : value),
    z.string().min(1).max(max),
  );

const centsOrNull = z
  .preprocess(
    (value) =>
      typeof value === 'number' && Number.isFinite(value)
        ? value < 0
          ? null
          : Math.round(value)
        : value,
    z.number().int().nonnegative().nullable(),
  )
  .default(null);

const positiveInt = (fallback: number) =>
  z
    .preprocess(
      (value) =>
        typeof value === 'number' && Number.isFinite(value)
          ? Math.max(1, Math.round(value))
          : value,
      z.number().int().positive(),
    )
    .default(fallback);

/** Tablica, z której wypadają elementy niezgodne ze schematem — zamiast wywracać całość. */
const dropInvalid = <T extends z.ZodTypeAny>(element: T) =>
  z
    .preprocess(
      (value) =>
        Array.isArray(value) ? value.filter((entry) => element.safeParse(entry).success) : value,
      z.array(element),
    )
    .default([]);

// ---------------------------------------------------------------------------
// T-136 import biblioteki
// ---------------------------------------------------------------------------

export const LibraryImportItemSchema = z.object({
  name: clampedText(160),
  description: z.string().default(''),
  /** Istniejąca grupa (dokładna nazwa) albo nowa; `null` = bez grupy. */
  categoryName: z.string().nullable().default(null),
  pricingChoice: PricingChoiceIdSchema.default('flat_lump'),
  /** Tylko przy `flat_custom`. */
  unitLabel: z.string().nullable().default(null),
  /** Grosze. `null` = brak ceny w dokumencie albo „indywidualnie". */
  unitPriceCents: centsOrNull,
  /** „od …" — informacja, nie reguła liczenia. */
  minPriceCents: centsOrNull,
  confidence: AiConfidenceSchema.default('medium'),
  /** Skąd wiersz („wiersz 14", „tabela 2") — do podglądu, nie do zapisu. */
  sourceNote: z.string().default(''),
});
export type LibraryImportItem = z.infer<typeof LibraryImportItemSchema>;

export const LibraryImportProposalSchema = z.object({
  items: dropInvalid(LibraryImportItemSchema),
  newCategories: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});
export type LibraryImportProposal = z.infer<typeof LibraryImportProposalSchema>;

// ---------------------------------------------------------------------------
// T-137 brief → wycena
// ---------------------------------------------------------------------------

export const BriefProposalRoomSchema = z.object({
  roomTypeId: z.string().nullable().default(null),
  label: clampedText(80),
  qty: positiveInt(1),
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
  rooms: dropInvalid(BriefProposalRoomSchema),
  items: dropInvalid(BriefProposalItemSchema),
  openQuestions: z.array(z.string()).default([]),
});
export type BriefProposal = z.infer<typeof BriefProposalSchema>;

// ---------------------------------------------------------------------------
// T-140 wiadomość → teczka (klient + projekt + opcjonalnie wycena)
// ---------------------------------------------------------------------------

/**
 * To samo, co propozycja z briefu, plus to, czego brief nie potrzebował: kto
 * pisze i o jaki obiekt chodzi. Kolejność kluczy = kolejność w kopii Deno
 * (test parytetu porównuje listy).
 */
export const MessageProposalSchema = BriefProposalSchema.extend({
  /** Jedno zdanie: czego dotyczy wiadomość. */
  summary: z.string().default(''),
  client: z
    .object({
      name: z.string().default(''),
      city: z.string().default(''),
      /** Adres inwestycji — nie zamieszkania. */
      address: z.string().default(''),
    })
    .default({}),
  project: z
    .object({
      name: z.string().default(''),
      areaM2: z
        .preprocess(
          (value) =>
            typeof value === 'number' && Number.isFinite(value) && value > 0
              ? Math.round(value * 10) / 10
              : null,
          z.number().positive().nullable(),
        )
        .default(null),
      kind: ProjectKindSchema.nullable().catch(null).default(null),
    })
    .default({}),
  /** Czy wiadomość mówi o zakresie prac — bez tego nie ma sensu tworzyć wyceny. */
  hasScope: z.boolean().default(false),
});
export type MessageProposal = z.infer<typeof MessageProposalSchema>;

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
    /** Zero i ujemne przechodzą przez schemat — `applyCommentChanges` odrzuca je jako `bad_qty` z widocznym powodem. */
    qty: z.number(),
    reason: z.string().default(''),
  }),
]);
export type CommentChange = z.infer<typeof CommentChangeSchema>;

export const CommentChangesSchema = z.object({
  summary: z.string().default(''),
  changes: dropInvalid(CommentChangeSchema),
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
  'message-to-project': MessageProposalSchema,
} as const satisfies Record<AiAction, z.ZodTypeAny>;

export type AiResultOf<A extends AiAction> = z.infer<(typeof AI_RESULT_SCHEMAS)[A]>;
