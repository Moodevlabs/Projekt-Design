import { z } from 'zod';
import { ScheduleStageSchema } from '../schedule/schema';
import { builtInScheduleTemplate } from '../schedule/defaults';
import { StageEntrySchema } from '../documents/schema';
import { PriceListItemSchema } from '../documents/price-list';
import { builtInStagesTemplate } from '../documents/stages-defaults';
import { builtInPriceListTemplate } from '../documents/price-list-defaults';

/**
 * Biblioteka dokumentów (T-102).
 *
 * Wycena ma bibliotekę usług; termin, etapy współpracy i cennik dodatkowy
 * dostają własne sekcje. Wpis biblioteki to **szablon jednej pozycji** —
 * w kształcie istniejących schematów bez `id` — więc wstawienie do dokumentu
 * to `newStage(payload)` / `newStageEntry(payload)` / `newPriceListItem(payload)`
 * bez mapowania. Jeden plik dla trzech rodzajów, bo różnią się tylko `payload`.
 */

export const DocLibraryKindSchema = z.enum(['schedule', 'stages', 'price_list']);
export type DocLibraryKind = z.infer<typeof DocLibraryKindSchema>;
export const DOC_LIBRARY_KINDS = DocLibraryKindSchema.options;

/** Etap terminu bez `id` i bez pól etapu zbiorczego `extras` (ten nie jest wzorcem). */
export const ScheduleEntryPayloadSchema = ScheduleStageSchema.omit({
  id: true,
  kind: true,
  extras: true,
});
export const StagesEntryPayloadSchema = StageEntrySchema.omit({ id: true });
export const PriceListEntryPayloadSchema = PriceListItemSchema.omit({ id: true });

export type ScheduleEntryPayload = z.infer<typeof ScheduleEntryPayloadSchema>;
export type StagesEntryPayload = z.infer<typeof StagesEntryPayloadSchema>;
export type PriceListEntryPayload = z.infer<typeof PriceListEntryPayloadSchema>;

export interface DocLibraryPayloadByKind {
  schedule: ScheduleEntryPayload;
  stages: StagesEntryPayload;
  price_list: PriceListEntryPayload;
}
export type DocLibraryPayload = DocLibraryPayloadByKind[DocLibraryKind];

export interface DocLibraryEntry<K extends DocLibraryKind = DocLibraryKind> {
  id: string;
  workspaceId: string;
  kind: K;
  /** Kopia `payload.name` — lista i szukanie nie rozpakowują JSONB. */
  name: string;
  payload: DocLibraryPayloadByKind[K];
  sortOrder: number;
  /** Wpis z wbudowanego szablonu; edycja zdejmuje flagę (jak w usługach, D4). */
  isSample: boolean;
}

const PAYLOAD_SCHEMAS = {
  schedule: ScheduleEntryPayloadSchema,
  stages: StagesEntryPayloadSchema,
  price_list: PriceListEntryPayloadSchema,
} as const;

/**
 * Miękkie parsowanie `payload` z bazy.
 *
 * Jak `parseScheduleBody`: wpis zapisany nowszą wersją albo zepsuty ręcznie
 * nie ma prawa wywalić całej sekcji biblioteki. Wpis, którego nie da się
 * odczytać, dostaje `null` i UI pokazuje go jako uszkodzony, a nie białą stronę.
 */
export function parseDocLibraryPayload<K extends DocLibraryKind>(
  kind: K,
  raw: unknown,
): DocLibraryPayloadByKind[K] | null {
  const schema = PAYLOAD_SCHEMAS[kind];
  // Nazwa siedzi też w kolumnie — `payload` bez niej (stary zapis) jest OK.
  const parsed = schema.safeParse(raw ?? {});
  return parsed.success ? (parsed.data as DocLibraryPayloadByKind[K]) : null;
}

/** Nowy, pusty wpis danego rodzaju — do „Dodaj własną" w bibliotece. */
export function emptyDocLibraryPayload<K extends DocLibraryKind>(
  kind: K,
  name = '',
): DocLibraryPayloadByKind[K] {
  switch (kind) {
    case 'schedule':
      return ScheduleEntryPayloadSchema.parse({
        name: name || 'Nowy etap',
        owner: 'provider',
      }) as DocLibraryPayloadByKind[K];
    case 'stages':
      return StagesEntryPayloadSchema.parse({ name }) as DocLibraryPayloadByKind[K];
    default:
      return PriceListEntryPayloadSchema.parse({ name }) as DocLibraryPayloadByKind[K];
  }
}

/**
 * Wbudowany szablon rodzaju — treść seedu przy pierwszym otwarciu sekcji.
 *
 * Źródłem są te same listy, z których do T-101 pre-wypełniał się dokument
 * w wycenie. Jedna treść, dwa zastosowania — nie kopiujemy jej do SQL.
 */
export function builtInDocLibrary<K extends DocLibraryKind>(kind: K): DocLibraryPayloadByKind[K][] {
  switch (kind) {
    case 'schedule':
      return builtInScheduleTemplate() as DocLibraryPayloadByKind[K][];
    case 'stages':
      return builtInStagesTemplate() as DocLibraryPayloadByKind[K][];
    default:
      return builtInPriceListTemplate() as DocLibraryPayloadByKind[K][];
  }
}

/**
 * Wpisy biblioteki jako szablon dokumentu (`*Template[]`) — do „Dodaj
 * wszystkie" i do pre-wypełniania. Uszkodzone wpisy pomijamy, nie blokujemy.
 */
export function docLibraryAsTemplate<K extends DocLibraryKind>(
  entries: DocLibraryEntry<K>[],
): DocLibraryPayloadByKind[K][] {
  return entries.map((entry) => entry.payload);
}
