import { z } from 'zod';
import { newId } from '../id';
import { ItemKindSchema, type Item } from '../quote/schema';

/**
 * Biblioteka pozycji i zestawów — parytet z tabelami `library_items`
 * i `library_groups` (docs/02-DATABASE.md §1).
 */

export const LibraryItemSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  category: z.string().default('Inne'),
  kind: ItemKindSchema.default('item'),
  name: z.string().min(1),
  description: z.string().default(''),
  unitPriceCents: z.number().int().default(0),
  sortOrder: z.number().int().default(0),
});
export type LibraryItem = z.infer<typeof LibraryItemSchema>;

/**
 * Pozycja zapisana wewnątrz grupy bibliotecznej. To snapshot (nie FK) — grupa
 * ma być „zestawem startowym”, odpornym na późniejsze zmiany w bibliotece.
 */
export const LibraryItemSnapshotSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  kind: ItemKindSchema.default('item'),
  /**
   * Ilość jest częścią zestawu, nie tylko wyceny: „Kuchnia” to 14 m² projektu
   * i 3 wizualizacje, a nie po jednej sztuce wszystkiego. Bez tego pola zapis
   * zestawu z wyceny gubiłby liczby wpisane ręcznie, a seed (który `qty` podaje)
   * rozjeżdżał się ze schematem. `default(1)` trzyma zgodność ze starymi
   * wpisami w jsonb.
   */
  qty: z.number().positive().default(1),
  unitPriceCents: z.number().int().default(0),
  libraryItemId: z.string().uuid().nullable().default(null),
});
export type LibraryItemSnapshot = z.infer<typeof LibraryItemSnapshotSchema>;

export const LibraryGroupSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  items: z.array(LibraryItemSnapshotSchema).default([]),
  sortOrder: z.number().int().default(0),
});
export type LibraryGroup = z.infer<typeof LibraryGroupSchema>;

/**
 * Zamienia pozycję biblioteczną na pozycję wyceny. Ustawia `libraryItemId`,
 * dzięki czemu edycja w bibliotece może kaskadować do otwartej wyceny.
 */
export function libraryItemToQuoteItem(
  libraryItem: LibraryItem,
  overrides: Partial<Item> = {},
): Item {
  return {
    id: newId(),
    kind: libraryItem.kind,
    name: libraryItem.name,
    description: libraryItem.description,
    qty: 1,
    unitPriceCents: libraryItem.unitPriceCents,
    enabled: true,
    libraryItemId: libraryItem.id,
    // Wpisy biblioteczne dostaną własne reguły cenowe dopiero w T-34
    // (`library_items.pricing`); do tego czasu wstawiamy pozycję stałocenową.
    pricing: { mode: 'flat' },
    roomId: null,
    ...overrides,
  };
}

/** Zamienia snapshot z grupy bibliotecznej na pozycję wyceny. */
export function librarySnapshotToQuoteItem(snapshot: LibraryItemSnapshot): Item {
  return {
    id: newId(),
    kind: snapshot.kind,
    name: snapshot.name,
    description: snapshot.description,
    qty: snapshot.qty,
    unitPriceCents: snapshot.unitPriceCents,
    enabled: true,
    libraryItemId: snapshot.libraryItemId,
    pricing: { mode: 'flat' },
    roomId: null,
  };
}

/**
 * Zamienia pozycję wyceny na snapshot do zestawu bibliotecznego.
 *
 * `enabled` i `id` zostają w wycenie — wyłączona pozycja to decyzja w tej
 * konkretnej ofercie, a nie cecha zestawu. `libraryItemId` przenosimy, bo dzięki
 * niemu pozycja wstawiona z zestawu dalej łapie kaskadę zmian z biblioteki.
 */
export function quoteItemToLibrarySnapshot(item: Item): LibraryItemSnapshot {
  return {
    name: item.name,
    description: item.description,
    kind: item.kind,
    qty: item.qty,
    unitPriceCents: item.unitPriceCents,
    libraryItemId: item.libraryItemId,
  };
}

/**
 * Snapshot z pozycji bibliotecznej — na potrzeby „dodaj pozycję do zestawu”
 * w bibliotece. Ilość startowa to 1; użytkownik poprawia ją na karcie zestawu.
 */
export function libraryItemToSnapshot(libraryItem: LibraryItem): LibraryItemSnapshot {
  return {
    name: libraryItem.name,
    description: libraryItem.description,
    kind: libraryItem.kind,
    qty: 1,
    unitPriceCents: libraryItem.unitPriceCents,
    libraryItemId: libraryItem.id,
  };
}
