import { z } from 'zod';
import {
  LibraryGroupSchema,
  LibraryItemSnapshotSchema,
  type LibraryGroup,
  type LibraryItemSnapshot,
} from '@/domain/library/schema';
import {
  ItemKindSchema,
  PricingBasisSchema,
  PricingRuleSchema,
  UnitSchema,
  type ItemKind,
  type PricingBasis,
  type PricingRule,
  type Unit,
} from '@/domain/quote';
import { getSupabase } from '@/data/supabase';
import type { Tables, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('library.repo');

/** Kategoria, do której wpadają pozycje bez wskazanej kategorii (jak default w migracji). */
export const DEFAULT_CATEGORY = 'Inne';

type ItemRow = Tables<'library_items'>;
type GroupRow = Tables<'library_groups'>;

/**
 * Odpowiednik `LibraryItem` z domeny, ale z kompletem pól — zod-owy typ ma
 * przy wejściu pola opcjonalne, a repozytorium zwraca zawsze wszystko.
 */
export interface LibraryItem {
  id: string;
  workspaceId: string;
  /** DEPRECATED (T-69): kopia nazwy grupy. Zrodlem jest `categoryId`. */
  category: string;
  /** Grupa ze slownika (T-59). `null` = „Bez grupy". */
  categoryId: string | null;
  kind: ItemKind;
  name: string;
  description: string;
  /** `null` = wycena indywidualna (T-60). Nie myl z zerem („gratis"). */
  unitPriceCents: number | null;
  /** Jednostka ilosci — snapshot kaskadujacy do wyceny. */
  unit: Unit;
  unitLabel: string | null;
  /** Cena „od" na liscie. INFORMACJA, nie regula liczenia. */
  minPriceCents: number | null;
  /** `false` chowa usluge z pickera, ale nie z wycen, ktore ja maja. */
  active: boolean;
  isSample: boolean;
  sortOrder: number;
  pricing: PricingRule;
  /**
   * Lider grupy wariantow (`null` = pozycja samodzielna albo sam lider).
   * Uzasadnienie modelu stoi w migracji `0010_library_variants.sql`.
   */
  variantOf: string | null;
  /**
   * Czym sa liczby tego wpisu: `amount` = grosze, `time` = minuty pracy.
   *
   * Wpis OPISUJE SAM SIEBIE, zamiast zalezec od trybu wyceny, ktora go
   * czyta — inaczej „45" z wyceny godzinowej wstawione do kwotowej stalo by
   * sie 45 groszy i nikt by tego nie zauwazyl. Patrz migracja `0011`.
   */
  pricingBasis: PricingBasis;
}

export interface LibraryItemFilters {
  category?: string;
  /** Filtr po grupie ze slownika (T-59). `'none'` = uslugi bez grupy. */
  categoryId?: string;
  search?: string;
}

/**
 * Reguła cenowa z `jsonb`. Parsujemy miękko: wpis zapisany nowszą wersją
 * aplikacji (albo ręcznie zepsuty) wraca jako `flat`, żeby jedna pozycja nie
 * wywaliła całej biblioteki. Cena jednostkowa zostaje, więc pozycja dalej ma
 * sensowną wartość — tyle że bez składnika za pomieszczenia.
 */
function parsePricing(raw: unknown, id: string): PricingRule {
  const parsed = PricingRuleSchema.safeParse(raw ?? { mode: 'flat' });
  if (parsed.success) return parsed.data;

  log.warn('Nieczytelna reguła cenowa pozycji bibliotecznej — używam stałej ceny', {
    id,
    issues: parsed.error.issues,
  });
  return { mode: 'flat' };
}

function mapItem(row: ItemRow): LibraryItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    category: row.category || DEFAULT_CATEGORY,
    categoryId: row.category_id ?? null,
    // `kind` jest w bazie tekstem z CHECK-iem; `catch` chroni przed rozjazdem migracji.
    kind: ItemKindSchema.catch('item').parse(row.kind),
    name: row.name,
    description: row.description ?? '',
    // `?? null`, a nie `?? 0` — brak ceny to „indywidualnie", nie „gratis".
    unitPriceCents: row.unit_price_cents === null ? null : Number(row.unit_price_cents),
    unit: UnitSchema.catch('lump').parse(row.unit),
    unitLabel: row.unit_label ?? null,
    minPriceCents: row.min_price_cents === null ? null : Number(row.min_price_cents),
    active: row.active ?? true,
    isSample: row.is_sample ?? false,
    sortOrder: Number(row.sort_order ?? 0),
    pricing: parsePricing(row.pricing, row.id),
    variantOf: row.variant_of ?? null,
    // Kolumna ma CHECK w bazie; `catch` chroni przed rozjazdem migracji.
    pricingBasis: PricingBasisSchema.catch('amount').parse(row.pricing_basis),
  };
}

/**
 * `items` w grupie to jsonb — może pochodzić ze starszej wersji aplikacji.
 * Parsujemy miękko: gdy snapshot nie przechodzi walidacji, logujemy i zwracamy
 * pustą listę zamiast wywalać całą stronę (analogicznie do `bodyError` w quotes.repo).
 */
function parseGroupItems(raw: unknown, groupId: string): LibraryItemSnapshot[] {
  const parsed = z.array(LibraryItemSnapshotSchema).safeParse(raw);
  if (parsed.success) return parsed.data;
  log.warn('Uszkodzone pozycje grupy bibliotecznej — zwracam pustą listę', {
    id: groupId,
    issues: parsed.error.issues,
  });
  return [];
}

function mapGroup(row: GroupRow): LibraryGroup {
  const candidate = {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    items: parseGroupItems(row.items, row.id),
    sortOrder: Number(row.sort_order ?? 0),
  };

  const parsed = LibraryGroupSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  // Kolumn poza `items` pilnuje schemat tabeli, więc tu trafimy tylko przy
  // rozjeździe migracji. Lepiej pokazać ułomną grupę niż pustą bibliotekę.
  log.warn('Grupa biblioteczna niezgodna ze schematem', {
    id: row.id,
    issues: parsed.error.issues,
  });
  return { ...candidate, name: candidate.name || 'Bez nazwy' };
}

/**
 * Pozycje biblioteki. Kolejność: `sort_order`, a przy remisie alfabetycznie —
 * użytkownik ustawia `sort_order` ręcznie tylko dla części pozycji.
 */
export async function listLibraryItems(
  workspaceId: string,
  opts: LibraryItemFilters = {},
): Promise<LibraryItem[]> {
  let query = getSupabase()
    .from('library_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null);

  if (opts.category) query = query.eq('category', opts.category);
  // `'none'` to nie id, tylko jawne pytanie o usługi bez grupy — te też
  // muszą dać się odfiltrować, inaczej po usunięciu grupy znikałyby z widoku.
  if (opts.categoryId === 'none') query = query.is('category_id', null);
  else if (opts.categoryId) query = query.eq('category_id', opts.categoryId);

  const term = opts.search?.trim();
  if (term) {
    // Szukamy po nazwie i opisie — to jedyne teksty widoczne na liście.
    const pattern = '%' + term + '%';
    query = query.or('name.ilike.' + pattern + ',description.ilike.' + pattern);
  }

  const rows = unwrap(
    await query.order('sort_order', { ascending: true }).order('name', { ascending: true }),
    'Lista pozycji biblioteki',
  );
  return rows.map(mapItem);
}

/**
 * Unikalne kategorie do filtra. Liczymy w JS z jednej kolumny — kategorii są
 * dziesiątki, więc RPC albo osobny widok nie opłaca się utrzymywać.
 */
export async function listLibraryCategories(workspaceId: string): Promise<string[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_items')
      .select('category')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null),
    'Kategorie biblioteki',
  );

  const unique = new Set(rows.map((row) => row.category || DEFAULT_CATEGORY));
  return [...unique].sort((a, b) => a.localeCompare(b, 'pl'));
}

export interface CreateLibraryItemInput {
  workspaceId: string;
  name: string;
  category?: string;
  categoryId?: string | null;
  kind?: ItemKind;
  description?: string;
  unitPriceCents?: number | null;
  unit?: Unit;
  unitLabel?: string | null;
  minPriceCents?: number | null;
  active?: boolean;
  sortOrder?: number;
  pricing?: PricingRule;
  variantOf?: string | null;
  pricingBasis?: PricingBasis;
}

export async function createLibraryItem(input: CreateLibraryItemInput): Promise<LibraryItem> {
  const rows = unwrap(
    await getSupabase()
      .from('library_items')
      .insert({
        workspace_id: input.workspaceId,
        category: input.category ?? DEFAULT_CATEGORY,
        category_id: input.categoryId ?? null,
        kind: input.kind ?? 'item',
        name: input.name,
        description: input.description ?? '',
        unit_price_cents: input.unitPriceCents === undefined ? 0 : input.unitPriceCents,
        unit: input.unit ?? 'lump',
        unit_label: input.unitLabel ?? null,
        min_price_cents: input.minPriceCents ?? null,
        active: input.active ?? true,
        sort_order: input.sortOrder ?? 0,
        pricing: input.pricing ?? { mode: 'flat' },
        variant_of: input.variantOf ?? null,
        pricing_basis: input.pricingBasis ?? 'amount',
      })
      .select('*'),
    'Dodanie pozycji do biblioteki',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się dodać pozycji do biblioteki.');
  return mapItem(row);
}

export type LibraryItemPatch = Partial<Omit<LibraryItem, 'id' | 'workspaceId'>>;

export async function updateLibraryItem(id: string, patch: LibraryItemPatch): Promise<LibraryItem> {
  // Typowany `update()` nie przyjmuje luźnego obiektu — składamy `TablesUpdate`
  // pole po polu, żeby `undefined` nie wyzerowało kolumny.
  const update: TablesUpdate<'library_items'> = {};
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
  if (patch.kind !== undefined) update.kind = patch.kind;
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.unitPriceCents !== undefined) update.unit_price_cents = patch.unitPriceCents;
  if (patch.unit !== undefined) update.unit = patch.unit;
  if (patch.unitLabel !== undefined) update.unit_label = patch.unitLabel;
  if (patch.minPriceCents !== undefined) update.min_price_cents = patch.minPriceCents;
  if (patch.active !== undefined) update.active = patch.active;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (patch.pricing !== undefined) update.pricing = patch.pricing;
  // `null` jest tu znaczace („odepnij od grupy"), wiec sprawdzamy `undefined`.
  if (patch.variantOf !== undefined) update.variant_of = patch.variantOf;
  if (patch.pricingBasis !== undefined) update.pricing_basis = patch.pricingBasis;

  const rows = unwrap(
    await getSupabase().from('library_items').update(update).eq('id', id).select('*'),
    'Zapis pozycji biblioteki',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać pozycji biblioteki.');
  return mapItem(row);
}

/**
 * Soft delete — pozycja bywa powiązana z wycenami przez `libraryItemId`,
 * więc twarde skasowanie zerwałoby kaskadę zmian do otwartej wyceny (T-10).
 */
export async function deleteLibraryItem(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('library_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie pozycji biblioteki',
  );
}

export async function listLibraryGroups(workspaceId: string): Promise<LibraryGroup[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_groups')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'Lista grup biblioteki',
  );
  return rows.map(mapGroup);
}

export interface CreateLibraryGroupInput {
  workspaceId: string;
  name: string;
  items?: LibraryItemSnapshot[];
  sortOrder?: number;
}

export async function createLibraryGroup(input: CreateLibraryGroupInput): Promise<LibraryGroup> {
  const rows = unwrap(
    await getSupabase()
      .from('library_groups')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        items: input.items ?? [],
        sort_order: input.sortOrder ?? 0,
      })
      .select('*'),
    'Dodanie grupy do biblioteki',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się dodać grupy do biblioteki.');
  return mapGroup(row);
}

export type LibraryGroupPatch = Partial<Omit<LibraryGroup, 'id' | 'workspaceId'>>;

export async function updateLibraryGroup(
  id: string,
  patch: LibraryGroupPatch,
): Promise<LibraryGroup> {
  const update: TablesUpdate<'library_groups'> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.items !== undefined) update.items = patch.items;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const rows = unwrap(
    await getSupabase().from('library_groups').update(update).eq('id', id).select('*'),
    'Zapis grupy biblioteki',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać grupy biblioteki.');
  return mapGroup(row);
}

/** Soft delete — spójnie z pozycjami; grupa to też dane użytkownika. */
export async function deleteLibraryGroup(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('library_groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie grupy biblioteki',
  );
}

/**
 * Wejście dla „zapisz do biblioteki" — strukturalnie zgodne z `Item` z wyceny,
 * więc pozycje edytora można przekazać bez mapowania.
 */
export interface SaveToLibraryInput {
  name: string;
  description?: string;
  kind?: ItemKind;
  /** `null` = wycena indywidualna (T-60). */
  unitPriceCents: number | null;
  category?: string;
}

/** Najwyższy `sort_order` w bibliotece — nowe pozycje dopisujemy na koniec. */
async function maxSortOrder(workspaceId: string): Promise<number> {
  const rows = unwrap(
    await getSupabase()
      .from('library_items')
      .select('sort_order')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: false })
      .limit(1),
    'Kolejność pozycji biblioteki',
  );
  return Number(rows[0]?.sort_order ?? 0);
}

/**
 * Masowy zapis pozycji z wyceny do biblioteki („zapisz wszystko", T-10).
 * Jeden insert zamiast pętli — inaczej 40 pozycji to 40 round-tripów i 40 szans
 * na częściowy zapis. Pozycje bez nazwy pomijamy: nie przeszłyby walidacji.
 */
export async function saveItemsToLibrary(
  workspaceId: string,
  items: SaveToLibraryInput[],
): Promise<LibraryItem[]> {
  const named = items.filter((item) => item.name.trim().length > 0);
  if (named.length === 0) return [];

  const base = await maxSortOrder(workspaceId);

  const rows = unwrap(
    await getSupabase()
      .from('library_items')
      .insert(
        named.map((item, index) => ({
          workspace_id: workspaceId,
          category: item.category ?? DEFAULT_CATEGORY,
          kind: item.kind ?? 'item',
          name: item.name.trim(),
          description: item.description ?? '',
          unit_price_cents: item.unitPriceCents,
          // Odstępy co 10, żeby dało się wcisnąć pozycję między istniejące.
          sort_order: base + (index + 1) * 10,
        })),
      )
      .select('*'),
    'Zapis pozycji do biblioteki',
  );

  return rows.map(mapItem);
}

export interface LibraryItemUsage {
  itemId: string;
  quotesCount: number;
  lastUsedAt: string | null;
}

/**
 * Statystyki uzycia uslug — „uzyta w 24 wycenach" na karcie (T-61).
 *
 * Liczone NA ZADANIE przez RPC z `quotes.body` (migracja 0021), a nie
 * denormalizowane licznikiem: to liczba orientacyjna, nie dana, na ktorej
 * cokolwiek sie opiera. Utrzymywanie jej triggerem przy kazdym zapisie
 * wyceny kosztowaloby wiecej, niz jest warta.
 */
export async function fetchLibraryUsage(workspaceId: string): Promise<LibraryItemUsage[]> {
  const { data, error } = await getSupabase().rpc('library_item_usage', { ws: workspaceId });
  if (error) throw new RepoError(`Statystyki uzycia: ${error.message}`, error);

  return (data ?? []).map((row) => ({
    itemId: row.item_id,
    quotesCount: Number(row.quotes_count ?? 0),
    lastUsedAt: row.last_used_at,
  }));
}
