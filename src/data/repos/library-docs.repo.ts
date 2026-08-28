import {
  parseDocLibraryPayload,
  type DocLibraryEntry,
  type DocLibraryKind,
  type DocLibraryPayloadByKind,
} from '@/domain/library/doc-entries';
import { getSupabase } from '@/data/supabase';
import type { Json, TablesInsert, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('library-docs.repo');

/**
 * Biblioteka dokumentów (T-102) — etapy terminu, etapy współpracy, cennik.
 *
 * Osobne repozytorium od `library.repo` (usługi) i `library-categories.repo`
 * (grupy): to trzeci byt z własną tabelą. Trzy funkcje `list*` w jednym
 * pliku byłyby zaproszeniem do pomyłki przy imporcie.
 */

type Row = Record<string, unknown>;

/** Wiersz z `payload`, którego nie da się odczytać — UI pokaże go jako uszkodzony. */
export interface DocLibraryRow<K extends DocLibraryKind = DocLibraryKind> {
  entry: DocLibraryEntry<K> | null;
  id: string;
  name: string;
  isSample: boolean;
}

function mapRow<K extends DocLibraryKind>(kind: K, row: Row): DocLibraryRow<K> {
  const id = row.id as string;
  const name = (row.name as string) ?? '';
  const isSample = Boolean(row.is_sample);
  const payload = parseDocLibraryPayload(kind, row.payload);
  if (!payload) {
    log.error('Uszkodzony wpis biblioteki dokumentow', { id, kind });
    return { entry: null, id, name, isSample };
  }
  return {
    id,
    name,
    isSample,
    entry: {
      id,
      workspaceId: row.workspace_id as string,
      kind,
      name,
      payload: { ...payload, name: payload.name || name },
      sortOrder: Number(row.sort_order ?? 0),
      isSample,
    },
  };
}

export async function listDocLibrary<K extends DocLibraryKind>(
  workspaceId: string,
  kind: K,
): Promise<DocLibraryRow<K>[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_doc_entries')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('kind', kind)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    'Biblioteka dokumentow',
  );
  return (rows as unknown as Row[]).map((row) => mapRow(kind, row));
}

/**
 * Seed z wbudowanego szablonu — idempotentny po stronie bazy (RPC wstawia
 * tylko, gdy workspace nie ma ŻADNEGO wpisu tego rodzaju, także skasowanego).
 * Zwraca liczbę wstawionych wierszy; `0` = było już coś, nic nie ruszono.
 */
export async function seedDocLibrary<K extends DocLibraryKind>(
  workspaceId: string,
  kind: K,
  entries: DocLibraryPayloadByKind[K][],
): Promise<number> {
  const { data, error } = await getSupabase().rpc('seed_doc_library', {
    ws: workspaceId,
    kind,
    entries: entries as unknown as Json,
  });
  if (error) throw new RepoError('Seed biblioteki dokumentow: ' + error.message, error);
  return Number(data ?? 0);
}

export interface CreateDocLibraryInput<K extends DocLibraryKind> {
  workspaceId: string;
  kind: K;
  payload: DocLibraryPayloadByKind[K];
  sortOrder?: number;
}

export async function createDocLibraryEntry<K extends DocLibraryKind>(
  input: CreateDocLibraryInput<K>,
): Promise<DocLibraryRow<K>> {
  const insert: TablesInsert<'library_doc_entries'> = {
    workspace_id: input.workspaceId,
    kind: input.kind,
    name: input.payload.name.trim(),
    payload: input.payload,
    sort_order: input.sortOrder ?? 0,
  };
  const rows = unwrap(
    await getSupabase().from('library_doc_entries').insert(insert).select('*'),
    'Dodanie wpisu biblioteki',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie udalo sie dodac wpisu.');
  return mapRow(input.kind, row as unknown as Row);
}

/**
 * Zapis całego `payload` — wpis jest mały, a diff wymagałby wiedzy o kształcie
 * per rodzaj. Edycja zdejmuje `is_sample` (użytkownik „wziął" wpis), jak przy
 * usługach z biblioteki przykładowej.
 */
export async function updateDocLibraryEntry<K extends DocLibraryKind>(
  kind: K,
  id: string,
  payload: DocLibraryPayloadByKind[K],
): Promise<DocLibraryRow<K>> {
  const update: TablesUpdate<'library_doc_entries'> = {
    name: payload.name.trim(),
    payload: payload,
    is_sample: false,
  };
  const rows = unwrap(
    await getSupabase().from('library_doc_entries').update(update).eq('id', id).select('*'),
    'Zapis wpisu biblioteki',
  );
  const row = rows[0];
  if (!row) throw new RepoError('Nie znaleziono wpisu.');
  return mapRow(kind, row as unknown as Row);
}

/** Soft delete — wiersz zostaje, żeby seed nie wrócił po „usunąłem wszystko". */
export async function deleteDocLibraryEntry(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('library_doc_entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usuniecie wpisu biblioteki',
  );
}

/** Nowa kolejność = pozycja w tablicy. Jak `reorderLibraryCategories`. */
export async function reorderDocLibrary(ids: readonly string[]): Promise<void> {
  const supabase = getSupabase();
  for (const [index, id] of ids.entries()) {
    unwrap(
      await supabase
        .from('library_doc_entries')
        .update({ sort_order: index })
        .eq('id', id)
        .select('id'),
      'Kolejnosc biblioteki dokumentow',
    );
  }
}
