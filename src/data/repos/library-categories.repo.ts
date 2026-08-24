import { LIBRARY_COLORS, type LibraryCategory, type LibraryColor } from '@/domain/library/schema';
import { getSupabase } from '@/data/supabase';
import type { TablesInsert, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';

/**
 * Słownik grup bibliotecznych (B1, T-59).
 *
 * Osobne repozytorium od `library.repo`, bo to inny byt: grupa porządkuje
 * usługi, a zestaw (`library_groups`) je wstawia. Wrzucenie obu do jednego
 * pliku kończyłoby się myleniem `listLibraryGroups` z `listLibraryCategories`
 * przy każdym czytaniu.
 */

type Row = Record<string, unknown>;

function mapCategory(row: Row): LibraryCategory {
  const color = row.color;
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    code: typeof row.code === 'string' ? row.code : '',
    // Kolor spoza palety (np. wpisany ręcznie w bazie) traktujemy jak brak —
    // lepiej pigułka bez koloru niż taka, której nie widać na tle karty.
    color: LIBRARY_COLORS.includes(color as LibraryColor) ? (color as LibraryColor) : null,
    sortOrder: Number(row.sort_order ?? 0),
    isSample: Boolean(row.is_sample),
  };
}

export async function listLibraryCategoryRows(workspaceId: string): Promise<LibraryCategory[]> {
  const rows = unwrap(
    await getSupabase()
      .from('library_categories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'Grupy biblioteki',
  );
  return (rows as unknown as Row[]).map(mapCategory);
}

export interface CreateCategoryInput {
  workspaceId: string;
  name: string;
  code?: string;
  color?: LibraryColor | null;
  sortOrder?: number;
}

export async function createLibraryCategory(input: CreateCategoryInput): Promise<LibraryCategory> {
  const insert: TablesInsert<'library_categories'> = {
    workspace_id: input.workspaceId,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    color: input.color ?? null,
    sort_order: input.sortOrder ?? 0,
  };

  const rows = unwrap(
    await getSupabase().from('library_categories').insert(insert).select('*'),
    'Dodanie grupy',
  );
  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się dodać grupy.');
  return mapCategory(row);
}

export type CategoryPatch = Partial<Pick<LibraryCategory, 'name' | 'code' | 'color' | 'sortOrder'>>;

export async function updateLibraryCategory(
  id: string,
  patch: CategoryPatch,
): Promise<LibraryCategory> {
  const update: TablesUpdate<'library_categories'> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.code !== undefined) update.code = patch.code.trim() || null;
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const rows = unwrap(
    await getSupabase().from('library_categories').update(update).eq('id', id).select('*'),
    'Zapis grupy',
  );
  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać grupy.');
  return mapCategory(row);
}

/**
 * Usunięcie grupy **nie kasuje usług** (koncepcja §5 reguła 6).
 *
 * `on delete set null` na `category_id` zrobiłoby to samo przy twardym
 * skasowaniu wiersza, ale my robimy soft delete — więc trzeba odpiąć usługi
 * jawnie, inaczej zostałyby przypięte do grupy, której nikt już nie widzi.
 * Lądują w „Bez grupy" i czekają na przypisanie.
 *
 * To ta sama zasada co przy wariantach w T-52: sprzątanie działu nie kasuje
 * pracy, która w nim leżała.
 */
export async function deleteLibraryCategory(id: string): Promise<void> {
  const supabase = getSupabase();

  unwrap(
    await supabase.from('library_items').update({ category_id: null }).eq('category_id', id).select('id'),
    'Odpięcie usług od grupy',
  );

  unwrap(
    await supabase
      .from('library_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie grupy',
  );
}

/**
 * Zapis kolejności po przeciągnięciu.
 *
 * Jednym przebiegiem po całej liście, a nie „przesuń o jeden": kolejność jest
 * ciągła i zapisanie tylko przesuniętego wiersza zostawiłoby dziury, które
 * przy kolejnym przeciągnięciu dałyby nieprzewidywalny wynik.
 */
export async function reorderLibraryCategories(ids: readonly string[]): Promise<void> {
  const supabase = getSupabase();
  for (const [index, id] of ids.entries()) {
    unwrap(
      await supabase.from('library_categories').update({ sort_order: index }).eq('id', id).select('id'),
      'Kolejność grup',
    );
  }
}
