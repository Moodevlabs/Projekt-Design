import { z } from 'zod';
import { newId } from '../id';
import {
  ItemKindSchema,
  PricingRuleSchema,
  UnitSchema,
  type Item,
  type Unit,
} from '../quote/schema';

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
  /** `null` = wycena indywidualna (T-60). Nie myl z zerem („gratis"). */
  unitPriceCents: z.number().int().nullable().default(0),
  /** Jednostka ilości — kaskaduje do wyceny jak nazwa i cena. */
  unit: UnitSchema.default('lump'),
  unitLabel: z.string().optional(),
  /** Cena „od" na liście. INFORMACJA, nie reguła liczenia (§5 reguła 4). */
  minPriceCents: z.number().int().nullable().default(null),
  /** `false` chowa usługę z pickera, ale nie z wycen, które ją mają. */
  active: z.boolean().default(true),
  isSample: z.boolean().default(false),
  categoryId: z.string().uuid().nullable().default(null),
  sortOrder: z.number().int().default(0),
  /**
   * Reguła wyceny wpisu. Brak = `flat`, czyli zachowanie sprzed cennika
   * parametrycznego — wstawiona pozycja liczy się jako `qty × cena`.
   */
  pricing: PricingRuleSchema.default({ mode: 'flat' }),
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
  /**
   * `null` = pozycja „indywidualna" (T-60). Snapshot ma własny `default`
   * i **nie przechodzi przez `migrateBody`** — zestawy to osobna ścieżka
   * zgodności (§9.4).
   */
  unitPriceCents: z.number().int().nullable().default(0),
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
  /*
   * Bierzemy STRUKTURALNY podzbiór, a nie `LibraryItem`.
   *
   * Ten sam byt ma dwa opisy: zodowy `LibraryItem` (walidacja, pola
   * opcjonalne na wejściu) i interfejs z `library.repo` (zawsze komplet).
   * Wymaganie konkretnie jednego z nich zmuszałoby wołających do konwersji
   * w kółko — a funkcji potrzeba tylko tych kilku pól.
   */
  libraryItem: Pick<
    LibraryItem,
    'id' | 'kind' | 'name' | 'description' | 'unitPriceCents' | 'pricing'
  > & { unit?: Unit; unitLabel?: string | null },
  overrides: Partial<Item> = {},
): Item {
  return {
    id: newId(),
    kind: libraryItem.kind,
    name: libraryItem.name,
    description: libraryItem.description,
    qty: 1,
    unitPriceCents: libraryItem.unitPriceCents,
    // Jednostka jest SNAPSHOTEM z biblioteki i kaskaduje jak nazwa i cena
    // (§5 reguła 3) — bez niej wiersz „80 × 12 zł" gubi „m²".
    unit: libraryItem.unit ?? 'lump',
    ...(libraryItem.unitLabel ? { unitLabel: libraryItem.unitLabel } : {}),
    enabled: true,
    libraryItemId: libraryItem.id,
    // Reguła jedzie z biblioteki — pozycja wstawiona do wyceny liczy się tak,
    // jak opisano ją raz w cenniku.
    pricing: libraryItem.pricing,
    roomId: null,
    tags: [],
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
    // Zestaw nie niesie jednostki — snapshot powstał przed T-60 i dokładanie
    // jej teraz znaczyłoby zgadywanie. `lump` to zachowanie dotychczasowe.
    unit: 'lump',
    enabled: true,
    libraryItemId: snapshot.libraryItemId,
    pricing: { mode: 'flat' },
    roomId: null,
    // Snapshot zestawu nie niesie etykiet — sa cecha konkretnej wyceny
    // (F2.3), a nie opisu uslugi w bibliotece.
    tags: [],
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
export function libraryItemToSnapshot(
  // Ten sam powód co przy `libraryItemToQuoteItem`: podzbiór strukturalny,
  // żeby oba opisy pozycji bibliotecznej pasowały bez konwersji.
  libraryItem: Pick<LibraryItem, 'id' | 'kind' | 'name' | 'description' | 'unitPriceCents'>,
): LibraryItemSnapshot {
  return {
    name: libraryItem.name,
    description: libraryItem.description,
    kind: libraryItem.kind,
    qty: 1,
    unitPriceCents: libraryItem.unitPriceCents,
    libraryItemId: libraryItem.id,
  };
}

/**
 * Grupa biblioteczna — dział/etap porządkujący usługi („01 · Przygotowanie").
 *
 * **To nie to samo co „zestaw"** (tabela `library_groups`, snapshot pozycji
 * do wstawienia na raz). Dwa pojęcia zlewały się dotąd w jedno słowo; od T-59
 * rozchodzą się: grupa porządkuje, zestaw wstawia.
 */
export const LIBRARY_COLORS = [
  'sand',
  'sage',
  'sky',
  'clay',
  'plum',
  'moss',
  'slate',
] as const;
export type LibraryColor = (typeof LIBRARY_COLORS)[number];

export const LibraryCategorySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  /** Prefiks na liście, np. „01". Puste = studio nie numeruje etapów. */
  code: z.string().default(''),
  /**
   * Token z palety, nie dowolny hex (05-UI). Dowolny kolor pozwoliłby wybrać
   * taki, który znika na tle karty — a pigułka grupy ma być czytelna.
   */
  color: z.enum(LIBRARY_COLORS).nullable().default(null),
  sortOrder: z.number().int().default(0),
  isSample: z.boolean().default(false),
});
export type LibraryCategory = z.infer<typeof LibraryCategorySchema>;

/** Etykieta grupy na liście: „01 · Przygotowanie" albo sama nazwa. */
export function categoryLabel(category: Pick<LibraryCategory, 'code' | 'name'>): string {
  return category.code ? `${category.code} · ${category.name}` : category.name;
}
