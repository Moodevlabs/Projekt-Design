import {
  parseDocLibrarySetItems,
  type DocLibraryCategory,
  type DocLibrarySet,
} from '@/domain/library/doc-groups';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { LIBRARY_COLORS, type LibraryColor } from '@/domain/library/schema';
import { getSupabase } from '@/data/supabase';
import type { TablesInsert, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';

/**
 * Grupy i zestawy bibliotek dokumentów (T-121).
 *
 * Osobne repozytorium od `library-docs.repo` (wpisy) — tak samo jak przy
 * usługach grupy mieszkają obok pozycji, a nie w jednym pliku z nimi. Każda
 * funkcja bierze `kind`, bo obie tabele trzymają wszystkie trzy rodzaje
 * dokumentu w jednej, z dyskryminatorem.
 */

type Row = Record<string, unknown>;

// =============================================================================
// Grupy (słownik)
// =============================================================================

function mapCategory<K extends DocLibraryKind>(kind: K, row: Row): DocLibraryCategory {
  const color = row.color;
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    kind,
    name: row.name as string,
    code: typeof row.code === 'string' ? row.code : '',
    // Kolor spoza palety traktujemy jak brak — ta sama zasada co przy grupach
    // usług: lepiej pigułka bez koloru niż taka, której nie widać na karcie.
    color: LIBRARY_COLORS.includes(color as LibraryColor) ? (color as LibraryColor) : null,
    sortOrder: Number(row.sort_order ?? 0),
    isSample: Boolean(row.is_sample),
  };
}

export async function listDocCategories<K extends DocLibraryKind>(
  workspaceId: string,
  kind: K,
): Promise<DocLibraryCategory[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_doc_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('kind', kind)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'Grupy biblioteki dokumentow',
  );
  return (rows as unknown as Row[]).map((row) => mapCategory(kind, row));
}

export interface CreateDocCategoryInput<K extends DocLibraryKind> {
  workspaceId: string;
  kind: K;
  name: string;
  code?: string;
  color?: LibraryColor | null;
  sortOrder?: number;
}

export async function createDocCategory<K extends DocLibraryKind>(
  input: CreateDocCategoryInput<K>,
): Promise<DocLibraryCategory> {
  const insert: TablesInsert<'library_doc_categories'> = {
    workspace_id: input.workspaceId,
    kind: input.kind,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    color: input.color ?? null,
    sort_order: input.sortOrder ?? 0,
  };
  const rows = unwrap(
    await getSupabase().from('library_doc_categories').insert(insert).select('*'),
    'Dodanie grupy dokumentow',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie dodac grupy.');
  return mapCategory(input.kind, row as unknown as Row);
}

export type DocCategoryPatch = Partial<Pick<DocLibraryCategory, 'name' | 'code' | 'color' | 'sortOrder'>>;

export async function updateDocCategory<K extends DocLibraryKind>(
  kind: K,
  id: string,
  patch: DocCategoryPatch,
): Promise<DocLibraryCategory> {
  // Pole po polu, żeby `undefined` nie wyzerowało kolumny (wzorzec z `library.repo`).
  const update: TablesUpdate<'library_doc_categories'> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.code !== undefined) update.code = patch.code.trim() || null;
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const rows = unwrap(
    await getSupabase().from('library_doc_categories').update(update).eq('id', id).select('*'),
    'Zapis grupy dokumentow',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie znaleziono grupy.');
  return mapCategory(kind, row as unknown as Row);
}

/**
 * Usunięcie grupy **nie kasuje wpisów** — odpina je („Bez grupy") i chowa sam
 * słownikowy wiersz. Ta sama zasada co przy grupach usług: sprzątanie działu
 * nie ma prawa skasować pracy, która w nim leżała.
 *
 * Odpięcie robimy jawnie, mimo że klucz obcy ma `on delete set null
 * (category_id)`: kasujemy MIĘKKO (`deleted_at`), a soft delete to zwykły
 * `update` — baza nie odpala wtedy żadnej akcji klucza obcego. Bez tego
 * wywołania wpisy zostałyby z `category_id` wskazującym na grupę, której
 * lista już nie pokazuje.
 */
export async function deleteDocCategory(id: string): Promise<void> {
  const supabase = getSupabase();

  unwrap(
    await supabase
      .from('library_doc_entries')
      .update({ category_id: null })
      .eq('category_id', id)
      .select('id'),
    'Odpiecie wpisow od grupy',
  );

  unwrap(
    await supabase
      .from('library_doc_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usuniecie grupy dokumentow',
  );
}

/** Nowa kolejność = pozycja w tablicy. Jak `reorderLibraryCategories`. */
export async function reorderDocCategories(ids: readonly string[]): Promise<void> {
  const supabase = getSupabase();
  for (const [index, id] of ids.entries()) {
    unwrap(
      await supabase
        .from('library_doc_categories')
        .update({ sort_order: index })
        .eq('id', id)
        .select('id'),
      'Kolejnosc grup dokumentow',
    );
  }
}

/**
 * Przypisanie wpisu do grupy (albo odpięcie przez `null`).
 *
 * ⚠️ **Nie zdejmuje `is_sample`** — i to jest świadoma różnica wobec usług,
 * gdzie `updateLibraryItem` zeruje tę flagę przy KAŻDEJ zmianie (koncepcja §5
 * reguła 8, opisana w T-120). Tam regułą jest „edycja = wzięcie wpisu na
 * własność"; tutaj chodzi o uporządkowanie listy, a nie o zmianę treści.
 * Gdyby posprzątanie etapów terminu po grupach wypisywało je z biblioteki
 * przykładowej, „Usuń pozostałe przykładowe" przestałoby mieć co sprzątać.
 */
export async function setDocEntryCategory(
  entryId: string,
  categoryId: string | null,
): Promise<void> {
  unwrap(
    await getSupabase()
      .from('library_doc_entries')
      .update({ category_id: categoryId })
      .eq('id', entryId)
      .select('id'),
    'Przypisanie wpisu do grupy',
  );
}

// =============================================================================
// Zestawy (snapshot)
// =============================================================================

function mapSet<K extends DocLibraryKind>(kind: K, row: Row): DocLibrarySet<K> {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    kind,
    name: (row.name as string) ?? '',
    items: parseDocLibrarySetItems(kind, row.items),
    sortOrder: Number(row.sort_order ?? 0),
    isSample: Boolean(row.is_sample),
  };
}

export async function listDocSets<K extends DocLibraryKind>(
  workspaceId: string,
  kind: K,
): Promise<DocLibrarySet<K>[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_doc_sets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('kind', kind)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    'Zestawy biblioteki dokumentow',
  );
  return (rows as unknown as Row[]).map((row) => mapSet(kind, row));
}

export interface CreateDocSetInput<K extends DocLibraryKind> {
  workspaceId: string;
  kind: K;
  name: string;
  items?: DocLibraryPayloadByKind[K][];
  sortOrder?: number;
}

export async function createDocSet<K extends DocLibraryKind>(
  input: CreateDocSetInput<K>,
): Promise<DocLibrarySet<K>> {
  const insert: TablesInsert<'library_doc_sets'> = {
    workspace_id: input.workspaceId,
    kind: input.kind,
    name: input.name.trim(),
    items: input.items ?? [],
    sort_order: input.sortOrder ?? 0,
  };
  const rows = unwrap(
    await getSupabase().from('library_doc_sets').insert(insert).select('*'),
    'Dodanie zestawu dokumentow',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie dodac zestawu.');
  return mapSet(input.kind, row as unknown as Row);
}

export interface DocSetPatch<K extends DocLibraryKind> {
  name?: string;
  items?: DocLibraryPayloadByKind[K][];
  sortOrder?: number;
}

export async function updateDocSet<K extends DocLibraryKind>(
  kind: K,
  id: string,
  patch: DocSetPatch<K>,
): Promise<DocLibrarySet<K>> {
  const update: TablesUpdate<'library_doc_sets'> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.items !== undefined) update.items = patch.items;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const rows = unwrap(
    await getSupabase().from('library_doc_sets').update(update).eq('id', id).select('*'),
    'Zapis zestawu dokumentow',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie znaleziono zestawu.');
  return mapSet(kind, row as unknown as Row);
}

/** Soft delete — spójnie z wpisami (`deleteDocLibraryEntry`). */
export async function deleteDocSet(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('library_doc_sets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usuniecie zestawu dokumentow',
  );
}
