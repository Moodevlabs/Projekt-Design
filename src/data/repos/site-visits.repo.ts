import { getSupabase } from '@/data/supabase';
import {
  DEFAULT_SITE_CHECKS,
  RoomMeasurementSchema,
  SiteCheckSchema,
  type SiteVisit,
} from '@/domain/site-visit';
import { newId } from '@/domain/id';
import type { TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('site-visits.repo');

type Row = Record<string, unknown>;

/**
 * Wizje lokalne projektu (T-94).
 *
 * `rooms` i `checks` parsujemy MIĘKKO — wpis zrobiony starszą wersją
 * aplikacji ma prawo mieć inny kształt, a odrzucenie go przy odczycie
 * zabrałoby projektantowi notatkę z jedynej wizyty, na której był.
 */
function mapVisit(row: Row): SiteVisit {
  const rooms = RoomMeasurementSchema.array().safeParse(row.rooms);
  const checks = SiteCheckSchema.array().safeParse(row.checks);

  if (!rooms.success) log.warn('Nieczytelny obmiar wizji', { id: row.id });

  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    projectId: row.project_id as string,
    visitedAt: row.visited_at as string,
    attendees: (row.attendees as string | null) ?? '',
    rooms: rooms.success ? rooms.data : [],
    checks: checks.success ? checks.data : [],
    notes: (row.notes as string | null) ?? '',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listSiteVisits(projectId: string): Promise<SiteVisit[]> {
  const rows = unwrap(
    await getSupabase()
      .from('site_visits')
      .select('*')
      .eq('project_id', projectId)
      .order('visited_at', { ascending: false }),
    'Odczyt wizji lokalnych',
  );

  return (rows as unknown as Row[]).map(mapVisit);
}

/**
 * Nowa wizja — od razu ze spisem do sprawdzenia.
 *
 * Pusty formularz z przyciskiem „dodaj pozycję" zmuszałby do wpisywania
 * czternastu rzeczy, które i tak sprawdza się za każdym razem. Lista jest
 * punktem wyjścia: pozycje da się usunąć i dopisać.
 */
export async function createSiteVisit(input: {
  workspaceId: string;
  projectId: string;
  visitedAt: string;
}): Promise<SiteVisit> {
  const rows = unwrap(
    await getSupabase()
      .from('site_visits')
      .insert({
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        visited_at: input.visitedAt,
        checks: DEFAULT_SITE_CHECKS.map((check) => ({
          id: check.id,
          label: check.label,
          state: 'unknown',
          note: '',
        })),
        rooms: [],
      })
      .select('*'),
    'Utworzenie wizji lokalnej',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się utworzyć wizji lokalnej.');
  return mapVisit(row);
}

export type SiteVisitPatch = Partial<
  Pick<SiteVisit, 'visitedAt' | 'attendees' | 'rooms' | 'checks' | 'notes'>
>;

export async function updateSiteVisit(id: string, patch: SiteVisitPatch): Promise<SiteVisit> {
  // Pole po polu — `undefined` z częściowego patcha wyzerowałoby kolumny,
  // których nikt nie ruszał (ta sama zasada co w `brand.repo`).
  const update: TablesUpdate<'site_visits'> = {};
  if (patch.visitedAt !== undefined) update.visited_at = patch.visitedAt;
  if (patch.attendees !== undefined) update.attendees = patch.attendees;
  if (patch.rooms !== undefined) update.rooms = patch.rooms;
  if (patch.checks !== undefined) update.checks = patch.checks;
  if (patch.notes !== undefined) update.notes = patch.notes;

  const rows = unwrap(
    await getSupabase().from('site_visits').update(update).eq('id', id).select('*'),
    'Zapis wizji lokalnej',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać wizji lokalnej.');
  return mapVisit(row);
}

export async function deleteSiteVisit(id: string): Promise<void> {
  unwrap(
    await getSupabase().from('site_visits').delete().eq('id', id).select('id'),
    'Usunięcie wizji lokalnej',
  );
}

/** Nowy wiersz obmiaru — id nadaje aplikacja, bo to element w jsonb. */
export function newRoomMeasurement(name = '') {
  return { id: newId(), name, lengthCm: null, widthCm: null, heightCm: null, note: '' };
}

export function newSiteCheck(label = '') {
  return { id: newId(), label, state: 'unknown' as const, note: '' };
}
