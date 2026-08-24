import {
  ClientStatusSchema,
  type Client,
  type ClientDraft,
  type ClientOverview,
  type ClientStatus,
} from '@/domain/client/schema';
import { getSupabase } from '@/data/supabase';
import type { TablesInsert, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';

/**
 * Kartoteka klientów (K1, T-53).
 *
 * Lista czyta widok `clients_overview`, bo liczba wycen i wartość
 * zaakceptowanych mają być policzone w Postgresie (koncepcja §2 reguła 6).
 * Zapisy idą do tabeli `clients` — widok jest tylko do odczytu.
 */

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapClient(row: Row): Client {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    phone: text(row.phone),
    email: text(row.email),
    address: text(row.address),
    city: text(row.city),
    notes: text(row.notes),
    status: ClientStatusSchema.catch('active').parse(row.status),
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapOverview(row: Row): ClientOverview {
  return {
    ...mapClient(row),
    quotesCount: Number(row.quotes_count ?? 0),
    acceptedNetCents: Number(row.accepted_net_cents ?? 0),
    lastActivityAt: (row.last_activity_at as string) ?? (row.updated_at as string),
  };
}

export type ClientSort = 'name_asc' | 'activity_desc' | 'value_desc' | 'created_desc';

export interface ClientFilters {
  workspaceId: string;
  /** Fragment nazwy, e-maila, telefonu albo miasta — dopasowanie robi Postgres. */
  search?: string;
  status?: ClientStatus | 'all';
  sort?: ClientSort;
}

const SORTS: Record<ClientSort, { column: string; ascending: boolean }> = {
  name_asc: { column: 'name', ascending: true },
  activity_desc: { column: 'last_activity_at', ascending: false },
  value_desc: { column: 'accepted_net_cents', ascending: false },
  created_desc: { column: 'created_at', ascending: false },
};

/**
 * Warunek `ilike` dla jednej kolumny w `or(...)` PostgREST-a.
 *
 * Wartość idzie **w cudzysłowie**, a nie z odkreślonymi przecinkami:
 * `,` i `)` rozdzielają warunki w drzewie logicznym, a backslash **nie jest**
 * tam znakiem ucieczki — PostgREST odpowiada wtedy `failed to parse logic
 * tree` (złapane testem integracyjnym). W cudzysłowie uciekać trzeba już
 * tylko przed `"` i `\`.
 *
 * Wycinanie takich znaków z frazy odpada: „Kowalski, Jan" to nazwa, którą
 * człowiek widzi na ekranie i ma prawo w nią wpisać.
 */
function ilikeFilter(column: string, term: string): string {
  const escaped = term.replace(/["\\]/g, (znak) => '\\' + znak);
  return `${column}.ilike."%${escaped}%"`;
}

export async function listClients(filters: ClientFilters): Promise<ClientOverview[]> {
  const sort = SORTS[filters.sort ?? 'activity_desc'];

  let query = getSupabase()
    .from('clients_overview')
    .select('*')
    .eq('workspace_id', filters.workspaceId)
    .is('deleted_at', null);

  const status = filters.status ?? 'active';
  if (status !== 'all') query = query.eq('status', status);

  const term = filters.search?.trim();
  if (term) {
    query = query.or(
      ['name', 'email', 'phone', 'city'].map((column) => ilikeFilter(column, term)).join(','),
    );
  }

  const rows = unwrap(
    await query.order(sort.column, { ascending: sort.ascending, nullsFirst: false }),
    'Lista klientów',
  );
  return (rows as unknown as Row[]).map(mapOverview);
}

export async function getClient(id: string): Promise<Client> {
  const rows = unwrap(
    await getSupabase().from('clients').select('*').eq('id', id).limit(1),
    'Odczyt klienta',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie znaleziono klienta.');
  return mapClient(row);
}

/**
 * Klient z sumami — do nagłówka karty.
 *
 * Osobno od `getClient`, bo edytor wyceny i formularz potrzebują samych danych
 * kontaktowych i nie ma powodu, żeby przy każdym otwarciu combobox liczył
 * wartość zaakceptowanych ofert.
 */
export async function getClientOverview(id: string): Promise<ClientOverview> {
  const rows = unwrap(
    await getSupabase().from('clients_overview').select('*').eq('id', id).limit(1),
    'Odczyt klienta',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie znaleziono klienta.');
  return mapOverview(row);
}

/** Puste pole to `null` w bazie — nie `''`. Jeden zapis pustki, nie dwa. */
function toColumn(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface CreateClientInput extends ClientDraft {
  workspaceId: string;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const insert: TablesInsert<'clients'> = {
    workspace_id: input.workspaceId,
    name: input.name.trim(),
    phone: toColumn(input.phone),
    email: toColumn(input.email),
    address: toColumn(input.address),
    city: toColumn(input.city),
    notes: toColumn(input.notes),
  };

  const rows = unwrap(
    await getSupabase().from('clients').insert(insert).select('*'),
    'Dodanie klienta',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie udało się dodać klienta.');
  return mapClient(row);
}

export type ClientPatch = Partial<ClientDraft>;

export async function updateClient(id: string, patch: ClientPatch): Promise<Client> {
  const update: TablesUpdate<'clients'> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.phone !== undefined) update.phone = toColumn(patch.phone);
  if (patch.email !== undefined) update.email = toColumn(patch.email);
  if (patch.address !== undefined) update.address = toColumn(patch.address);
  if (patch.city !== undefined) update.city = toColumn(patch.city);
  if (patch.notes !== undefined) update.notes = toColumn(patch.notes);

  const rows = unwrap(
    await getSupabase().from('clients').update(update).eq('id', id).select('*'),
    'Zapis klienta',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie udało się zapisać klienta.');
  return mapClient(row);
}

/**
 * Archiwizacja i przywrócenie.
 *
 * `archived_at` idzie w parze ze statusem, żeby dało się później posortować
 * archiwum po dacie zamknięcia współpracy. Przywrócenie je zeruje — inaczej
 * klient wróciłby na listę z datą archiwizacji sprzed roku.
 */
export async function setClientStatus(id: string, status: ClientStatus): Promise<Client> {
  const rows = unwrap(
    await getSupabase()
      .from('clients')
      .update({
        status,
        archived_at: status === 'archived' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('*'),
    'Zmiana statusu klienta',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie udało się zmienić statusu klienta.');
  return mapClient(row);
}

/**
 * Kosz (soft delete). Wyceny zostają: `quotes.client_id` ma `on delete set
 * null` w bazie, ale my nie kasujemy wiersza, więc dokumenty dalej wskazują
 * na klienta i da się go przywrócić razem z historią.
 */
export async function deleteClient(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie klienta',
  );
}
