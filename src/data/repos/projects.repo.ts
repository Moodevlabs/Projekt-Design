import {
  ProjectStatusSchema,
  parseArea,
  type Project,
  type ProjectDraft,
  type ProjectOverview,
  type ProjectStatus,
} from '@/domain/project/schema';
import { getSupabase } from '@/data/supabase';
import type { TablesInsert, TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';

/**
 * Projekty klienta (K2, T-54).
 *
 * Lista czyta widok `projects_overview` — liczba wycen i wartość
 * zaakceptowanych mają być policzone w Postgresie, nie w przeglądarce.
 * Zapisy idą do tabeli `projects`.
 */

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mapProject(row: Row): Project {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    clientId: row.client_id as string,
    name: row.name as string,
    address: text(row.address),
    city: text(row.city),
    // `numeric` wraca z PostgREST-a jako string — bez `Number` metraż
    // porównywałby się leksykalnie i „9" wychodziłoby większe niż „164".
    areaM2: row.area_m2 === null || row.area_m2 === undefined ? null : Number(row.area_m2),
    kind: text(row.kind),
    status: ProjectStatusSchema.catch('lead').parse(row.status),
    startDate: (row.start_date as string | null) ?? null,
    notes: text(row.notes),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapOverview(row: Row): ProjectOverview {
  return {
    ...mapProject(row),
    clientName: text(row.client_name),
    quotesCount: Number(row.quotes_count ?? 0),
    acceptedNetCents: Number(row.accepted_net_cents ?? 0),
    lastActivityAt: (row.last_activity_at as string) ?? (row.updated_at as string),
  };
}

export interface ProjectFilters {
  workspaceId: string;
  /** Projekty jednego klienta. Pominięty = wszystkie w workspace (pulpit, ⌘K). */
  clientId?: string;
  status?: ProjectStatus | 'all';
  search?: string;
  limit?: number;
}

export async function listProjects(filters: ProjectFilters): Promise<ProjectOverview[]> {
  let query = getSupabase()
    .from('projects_overview')
    .select('*')
    .eq('workspace_id', filters.workspaceId)
    .is('deleted_at', null);

  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

  const term = filters.search?.trim();
  if (term) {
    // Wartość w cudzysłowie — backslash NIE jest w PostgREST znakiem ucieczki
    // w `or(...)`, więc fraza z przecinkiem wywracała zapytanie (T-53).
    const escaped = term.replace(/["\\]/g, (znak) => '\\' + znak);
    query = query.or(
      ['name', 'city', 'address', 'client_name']
        .map((column) => `${column}.ilike."%${escaped}%"`)
        .join(','),
    );
  }

  query = query.order('sort_order', { ascending: true }).order('updated_at', { ascending: false });
  if (filters.limit) query = query.limit(filters.limit);

  const rows = unwrap(await query, 'Lista projektów');
  return (rows as unknown as Row[]).map(mapOverview);
}

export async function getProject(id: string): Promise<Project> {
  const rows = unwrap(
    await getSupabase().from('projects').select('*').eq('id', id).limit(1),
    'Odczyt projektu',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie znaleziono projektu.');
  return mapProject(row);
}

export async function getProjectOverview(id: string): Promise<ProjectOverview> {
  const rows = unwrap(
    await getSupabase().from('projects_overview').select('*').eq('id', id).limit(1),
    'Odczyt projektu',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie znaleziono projektu.');
  return mapOverview(row);
}

/** Puste pole to `null` w bazie, nie `''`. Jeden zapis pustki, nie dwa. */
function toColumn(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface CreateProjectInput extends ProjectDraft {
  workspaceId: string;
  clientId: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const insert: TablesInsert<'projects'> = {
    workspace_id: input.workspaceId,
    client_id: input.clientId,
    name: input.name.trim(),
    address: toColumn(input.address),
    city: toColumn(input.city),
    area_m2: parseArea(input.areaM2),
    kind: toColumn(input.kind),
    status: input.status,
    start_date: toColumn(input.startDate),
    notes: toColumn(input.notes),
  };

  const rows = unwrap(
    await getSupabase().from('projects').insert(insert).select('*'),
    'Dodanie projektu',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie udało się dodać projektu.');
  return mapProject(row);
}

export type ProjectPatch = Partial<ProjectDraft>;

export async function updateProject(id: string, patch: ProjectPatch): Promise<Project> {
  const update: TablesUpdate<'projects'> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.address !== undefined) update.address = toColumn(patch.address);
  if (patch.city !== undefined) update.city = toColumn(patch.city);
  if (patch.areaM2 !== undefined) update.area_m2 = parseArea(patch.areaM2);
  if (patch.kind !== undefined) update.kind = toColumn(patch.kind);
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.startDate !== undefined) update.start_date = toColumn(patch.startDate);
  if (patch.notes !== undefined) update.notes = toColumn(patch.notes);

  const rows = unwrap(
    await getSupabase().from('projects').update(update).eq('id', id).select('*'),
    'Zapis projektu',
  );
  const row = rows[0] as unknown as Row | undefined;
  if (!row) throw new RepoError('Nie udało się zapisać projektu.');
  return mapProject(row);
}

/**
 * Zmiana samego statusu — osobno od `updateProject`, bo idzie z listy
 * i z toastu po akceptacji wyceny, gdzie reszty formularza nie ma pod ręką.
 */
export async function setProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
  return updateProject(id, { status });
}

/**
 * Kosz (soft delete). Wyceny zostają: `quotes.project_id` ma `on delete set
 * null`, ale my nie kasujemy wiersza, więc oferty dalej wskazują na teczkę
 * i da się ją przywrócić razem z historią.
 */
export async function deleteProject(id: string): Promise<void> {
  unwrap(
    await getSupabase()
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id'),
    'Usunięcie projektu',
  );
}

/**
 * Przeniesienie wyceny do innego projektu.
 *
 * W zwykłym przypadku zmienia **wyłącznie** `project_id` — przeniesienie to
 * zmiana szuflady, a nie treści oferty. `body`, totale i snapshot klienta
 * zostają nietknięte.
 *
 * `attachClientId` jest po to, żeby dało się wciągnąć do projektu wycenę,
 * która nie miała jeszcze klienta („szybka wycena" z paska). Wtedy razem
 * z teczką wycena dostaje jej właściciela — inaczej powstałby wiersz łamiący
 * hierarchię KLIENT → PROJEKT → WYCENA: oferta w cudzym projekcie i bez
 * klienta. UI podaje to pole **tylko** w tym przypadku i mówi o tym wprost
 * w dialogu; wycena, która klienta ma, widzi wyłącznie jego projekty.
 *
 * Bez blokady optymistycznej, jak `setQuoteStatus`: to pola OBOK dokumentu,
 * więc nie mogą wywołać konfliktu na `body` ani go nadpisać.
 *
 * `null` w `projectId` wyjmuje wycenę z projektu, zostawiając ją przy kliencie.
 */
export async function moveQuoteToProject(
  quoteId: string,
  projectId: string | null,
  attachClientId?: string,
): Promise<void> {
  unwrap(
    await getSupabase()
      .from('quotes')
      .update({
        project_id: projectId,
        ...(attachClientId ? { client_id: attachClientId } : {}),
      })
      .eq('id', quoteId)
      .select('id'),
    'Przeniesienie wyceny',
  );
}
