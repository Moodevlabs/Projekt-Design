import { z } from 'npm:zod@3.25.67/v4';

/**
 * Schematy odpowiedzi modelu — KOPIA `src/domain/ai/schema.ts` bez `.default()`.
 *
 * Funkcje brzegowe działają w Deno i nie importują kodu z `src/`. Rozjazd
 * między tym plikiem a domeną znaczyłby, że model odpowiada w kształcie,
 * którego aplikacja nie rozumie — dlatego oba pilnuje
 * `src/domain/ai/edge-parity.test.ts` (porównuje nazwy akcji i klucze
 * najwyższego poziomu każdego schematu).
 *
 * Brak `.default()` jest celowy: `zodOutputFormat` zamienia schemat na JSON
 * Schema dla modelu, a domyślne wartości nie mają tam odpowiednika — każde
 * pole jest wymagane, model wypełnia wszystkie.
 *
 * Zmieniasz tutaj? Zmień tam i odwrotnie.
 */

export const PRICING_CHOICE_IDS = [
  'flat_lump',
  'flat_m2',
  'per_room',
  'per_frame',
  'flat_hour',
  'flat_visit',
  'flat_element',
  'flat_custom',
  'individual',
] as const;

const Confidence = z.enum(['high', 'medium', 'low']);

export const LibraryImportProposalSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      categoryName: z.string().nullable(),
      pricingChoice: z.enum(PRICING_CHOICE_IDS),
      unitLabel: z.string().nullable(),
      unitPriceCents: z.number().int().nullable(),
      minPriceCents: z.number().int().nullable(),
      confidence: Confidence,
      sourceNote: z.string(),
    }),
  ),
  newCategories: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const BriefProposalSchema = z.object({
  title: z.string(),
  projectDescription: z.string(),
  templateId: z.string().nullable(),
  rooms: z.array(
    z.object({
      roomTypeId: z.string().nullable(),
      label: z.string(),
      qty: z.number().int(),
    }),
  ),
  items: z.array(
    z.object({
      libraryItemId: z.string(),
      enabled: z.boolean(),
      reason: z.string(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

export const CommentChangesSchema = z.object({
  summary: z.string(),
  changes: z.array(
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('disable'), itemId: z.string(), reason: z.string() }),
      z.object({ kind: z.literal('enable'), itemId: z.string(), reason: z.string() }),
      z.object({ kind: z.literal('remove'), itemId: z.string(), reason: z.string() }),
      z.object({
        kind: z.literal('add'),
        libraryItemId: z.string(),
        sectionId: z.string(),
        reason: z.string(),
      }),
      z.object({
        kind: z.literal('qty'),
        itemId: z.string(),
        qty: z.number(),
        reason: z.string(),
      }),
    ]),
  ),
  unresolved: z.array(z.string()),
});

export const PolishedTextSchema = z.object({
  text: z.string(),
  placeholdersKept: z.boolean(),
});

// ---------------------------------------------------------------------------
// Ładunki wejściowe (parytet z `src/domain/ai/payloads.ts`)
// ---------------------------------------------------------------------------

const FileSource = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string().min(1).max(200_000) }),
  z.object({ kind: z.literal('pdf'), base64: z.string().min(1) }),
  z.object({
    kind: z.literal('image'),
    mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
    base64: z.string().min(1),
  }),
]);

const LibraryEntry = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  pricing: z.string(),
  priceCents: z.number().int().nullable(),
});

export const ImportLibraryPayloadSchema = z.object({
  source: FileSource,
  categories: z.array(z.string()).max(200),
  existingNames: z.array(z.string()).max(2000),
});

export const BriefToQuotePayloadSchema = z.object({
  brief: z.object({
    questions: z
      .array(z.object({ section: z.string(), question: z.string(), answer: z.string() }))
      .min(1)
      .max(200),
  }),
  library: z.array(LibraryEntry).max(1000),
  templates: z
    .array(z.object({ id: z.string(), name: z.string(), itemNames: z.array(z.string()) }))
    .max(100),
  roomTypes: z.array(z.object({ id: z.string(), name: z.string() })).max(200),
});

const QuoteItemView = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  qty: z.number(),
  amount: z.string(),
  roomLabel: z.string().nullable(),
});

export const CommentsToChangesPayloadSchema = z.object({
  comment: z.string().min(1).max(4000),
  quote: z.object({
    rooms: z.array(z.object({ id: z.string(), label: z.string(), qty: z.number() })),
    sections: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        items: z.array(QuoteItemView),
        groups: z.array(
          z.object({ id: z.string(), name: z.string(), items: z.array(QuoteItemView) }),
        ),
      }),
    ),
  }),
  library: z.array(LibraryEntry).max(1000),
});

export const PolishTextPayloadSchema = z.object({
  field: z.enum(['intro', 'projectDescription', 'itemDescription']),
  text: z.string().max(4000),
  context: z.object({
    companyName: z.string(),
    itemName: z.string().optional(),
    rooms: z.array(z.string()).optional(),
  }),
});
