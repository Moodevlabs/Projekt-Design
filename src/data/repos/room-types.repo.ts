import { getSupabase } from '@/data/supabase';
import type { Tables, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';

/**
 * Słownik typów pomieszczeń workspace’u (kuchnia, salon, łazienka…).
 *
 * To po nich cennik parametryczny trafia w odpowiednią kolumnę macierzy, więc
 * `slug` jest kluczem technicznym i **nie zmienia się razem z nazwą** — inaczej
 * import CSV i zapisane reguły cenowe rozjechałyby się przy pierwszej korekcie
 * literówki w nazwie.
 */
export interface RoomType {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  sortOrder: number;
}

type Row = Tables<'room_types'>;

function mapRow(row: Row): RoomType {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

/**
 * Slug z nazwy: bez polskich znaków, małe litery, myślniki.
 *
 * Nie ma tu `String.normalize('NFD')` — rozkład Unicode nie rusza „ł”, więc
 * i tak potrzebna byłaby tablica wyjątków. Skoro tak, niech będzie jedna
 * i jawna.
 */
const POLISH: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

export function slugifyRoomType(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (znak) => POLISH[znak] ?? znak)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Nazwa złożona z samych znaków specjalnych zostawiłaby pusty slug, a ten
  // wpadłby w unikalny indeks przy drugim takim wpisie.
  return base.length > 0 ? base : 'typ';
}

export async function listRoomTypes(workspaceId: string): Promise<RoomType[]> {
  const rows = unwrap(
    await getSupabase()
      .from('room_types')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    'Lista typów pomieszczeń',
  );
  return rows.map(mapRow);
}

export interface CreateRoomTypeInput {
  workspaceId: string;
  name: string;
  slug?: string;
  sortOrder?: number;
}

export async function createRoomType(input: CreateRoomTypeInput): Promise<RoomType> {
  const rows = unwrap(
    await getSupabase()
      .from('room_types')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        slug: input.slug ?? slugifyRoomType(input.name),
        sort_order: input.sortOrder ?? 0,
      })
      .select('*'),
    'Dodanie typu pomieszczenia',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się dodać typu pomieszczenia.');
  return mapRow(row);
}

/** `slug` celowo poza łatką — patrz komentarz przy `RoomType`. */
export type RoomTypePatch = Partial<Pick<RoomType, 'name' | 'sortOrder'>>;

export async function updateRoomType(id: string, patch: RoomTypePatch): Promise<RoomType> {
  const update: TablesUpdate<'room_types'> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;

  const rows = unwrap(
    await getSupabase().from('room_types').update(update).eq('id', id).select('*'),
    'Zapis typu pomieszczenia',
  );

  const row = rows[0];
  if (!row) throw new RepoError('Nie udało się zapisać typu pomieszczenia.');
  return mapRow(row);
}

/**
 * Soft delete — `roomTypeId` siedzi w regułach cenowych pozycji bibliotecznych
 * i w pomieszczeniach zapisanych wycen. Twarde skasowanie zerwałoby te
 * odwołania i wyzerowało składniki cen w dokumentach sprzed usunięcia.
 */
export async function deleteRoomType(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('room_types')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie typu pomieszczenia',
  );
}
