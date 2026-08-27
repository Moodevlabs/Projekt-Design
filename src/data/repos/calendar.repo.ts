import { getSupabase } from '@/data/supabase';
import { routes } from '@/app/routes';
import { calcSchedule, parseScheduleBody } from '@/domain/schedule';
import { RoomSchema, type Room } from '@/domain/quote/schema';
import { shortTime, type CalendarEvent, type CalendarNote, type DayRange } from '@/domain/calendar';
import type { TablesUpdate } from '@/data/types.generated';
import { RepoError, unwrap } from './errors';
import { createLogger } from '@/lib/logger';

const log = createLogger('calendar.repo');

type Row = Record<string, unknown>;

/**
 * Dane kalendarza (T-98).
 *
 * ## Cztery zapytania, nie jedno
 *
 * Terminy pochodzą z bytów, które nie mają ze sobą nic wspólnego poza tym, że
 * niosą datę: teczka projektu, wizja lokalna, ważność oferty i harmonogram
 * zaakceptowanej wyceny. Widok scalający je w bazie musiałby znać wszystkie
 * cztery i zmieniać się przy każdej zmianie w którymkolwiek — a złączenie ich
 * w pamięci kosztuje tyle, ile cztery lekkie selecty z zakresem dat.
 *
 * ## Dlaczego termin z harmonogramu liczymy tutaj, a nie w bazie
 *
 * Data zakończenia nie jest zapisana nigdzie: powstaje z etapów, listy
 * pomieszczeń, dni roboczych w tygodniu i kalendarza świąt (`domain/schedule`).
 * Przeniesienie tej arytmetyki do SQL znaczyłoby drugą implementację reguł
 * wyceny — dokładnie to, czego zakazuje reguła 1 z CLAUDE.md.
 */
function mapNote(row: Row): CalendarNote {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    clientId: (row.client_id as string | null) ?? null,
    projectId: (row.project_id as string | null) ?? null,
    day: row.day as string,
    time: shortTime((row.at_time as string | null) ?? null),
    text: (row.text as string) ?? '',
    done: Boolean(row.done),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/* -------------------------------------------------------------------------- */
/* Notatki                                                                    */
/* -------------------------------------------------------------------------- */

export async function listCalendarNotes(range: DayRange): Promise<CalendarNote[]> {
  const rows = unwrap(
    await getSupabase()
      .from('calendar_notes')
      .select('*')
      .gte('day', range.from)
      .lte('day', range.to)
      .order('day', { ascending: true }),
    'Odczyt notatek kalendarza',
  );

  return (rows as unknown as Row[]).map(mapNote);
}

export interface CreateCalendarNoteInput {
  workspaceId: string;
  day: string;
  text: string;
  /** `HH:MM` albo `null` — większość wpisów godziny nie ma. */
  time?: string | null;
  clientId?: string | null;
  projectId?: string | null;
}

export async function createCalendarNote(input: CreateCalendarNoteInput): Promise<CalendarNote> {
  const rows = unwrap(
    await getSupabase()
      .from('calendar_notes')
      .insert({
        workspace_id: input.workspaceId,
        day: input.day,
        text: input.text,
        at_time: input.time ?? null,
        client_id: input.clientId ?? null,
        project_id: input.projectId ?? null,
      })
      .select('*'),
    'Utworzenie notatki kalendarza',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać notatki.');
  return mapNote(row);
}

export interface CalendarNotePatch {
  day?: string;
  text?: string;
  time?: string | null;
  done?: boolean;
}

export async function updateCalendarNote(
  id: string,
  patch: CalendarNotePatch,
): Promise<CalendarNote> {
  const update: TablesUpdate<'calendar_notes'> = {};
  if (patch.day !== undefined) update.day = patch.day;
  if (patch.text !== undefined) update.text = patch.text;
  if (patch.time !== undefined) update.at_time = patch.time;
  if (patch.done !== undefined) update.done = patch.done;

  const rows = unwrap(
    await getSupabase().from('calendar_notes').update(update).eq('id', id).select('*'),
    'Zapis notatki kalendarza',
  );

  const row = (rows as unknown as Row[])[0];
  if (!row) throw new RepoError('Nie udało się zapisać notatki — brak uprawnień.');
  return mapNote(row);
}

export async function deleteCalendarNote(id: string): Promise<void> {
  unwrap(
    await getSupabase().from('calendar_notes').delete().eq('id', id).select('id'),
    'Usunięcie notatki kalendarza',
  );
}

/* -------------------------------------------------------------------------- */
/* Zdarzenia z reszty aplikacji                                               */
/* -------------------------------------------------------------------------- */

/** Notatka jako zdarzenie siatki. */
export function noteToEvent(note: CalendarNote): CalendarEvent {
  return {
    id: `note:${note.id}`,
    kind: 'note',
    day: note.day,
    time: note.time,
    title: note.text,
    subtitle: null,
    href: null,
    done: note.done,
  };
}

async function projectStarts(range: DayRange): Promise<CalendarEvent[]> {
  const rows = unwrap(
    await getSupabase()
      .from('projects')
      .select('id, name, client_id, start_date, deleted_at')
      .gte('start_date', range.from)
      .lte('start_date', range.to)
      .is('deleted_at', null),
    'Odczyt terminów projektów',
  );

  return (rows as unknown as Row[]).map((row) => ({
    id: `project:${row.id as string}`,
    kind: 'project_start' as const,
    day: row.start_date as string,
    time: null,
    title: (row.name as string) ?? '',
    subtitle: null,
    href: routes.project(row.client_id as string, row.id as string),
  }));
}

async function siteVisits(range: DayRange): Promise<CalendarEvent[]> {
  const rows = unwrap(
    await getSupabase()
      .from('site_visits')
      .select('id, project_id, visited_at, attendees, projects(id, name, client_id)')
      .gte('visited_at', range.from)
      .lte('visited_at', range.to),
    'Odczyt wizji lokalnych',
  );

  return (rows as unknown as Row[]).map((row) => {
    const project = embedded(row.projects);
    return {
      id: `visit:${row.id as string}`,
      kind: 'site_visit' as const,
      day: row.visited_at as string,
      time: null,
      title: (project?.name as string) ?? '',
      subtitle: (row.attendees as string) || null,
      href:
        project && project.client_id
          ? routes.project(project.client_id as string, project.id as string)
          : null,
    };
  });
}

/** PostgREST oddaje relację do-jednego obiektem, ale starsze wersje — tablicą. */
function embedded(value: unknown): Row | null {
  if (!value) return null;
  return Array.isArray(value) ? ((value[0] as Row | undefined) ?? null) : (value as Row);
}

async function quoteValidity(range: DayRange): Promise<CalendarEvent[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quotes')
      .select('id, number, title, status, client_name, valid_until, deleted_at')
      .gte('valid_until', range.from)
      .lte('valid_until', range.to)
      .is('deleted_at', null)
      // Ważność szkicu nie znaczy nic — nikt jej nie widział poza autorem.
      .neq('status', 'draft'),
    'Odczyt ważności ofert',
  );

  return (rows as unknown as Row[]).map((row) => ({
    id: `validity:${row.id as string}`,
    kind: 'quote_validity' as const,
    day: row.valid_until as string,
    time: null,
    title: (row.title as string) || (row.number as string) || '',
    subtitle: (row.client_name as string) || null,
    href: routes.quote(row.id as string),
  }));
}

/**
 * Terminy z harmonogramów.
 *
 * Zakresu NIE da się przyciąć w zapytaniu — data zakończenia powstaje dopiero
 * po policzeniu etapów. Pobieramy więc wyceny z harmonogramem i odsiewamy je
 * w pamięci. Ograniczamy przy tym dwa razy: tylko wyceny z harmonogramem
 * i tylko te, które wyszły poza szkic; reszta nie ma terminu, który
 * ktokolwiek by uzgodnił.
 */
async function scheduleDeadlines(range: DayRange): Promise<CalendarEvent[]> {
  const rows = unwrap(
    await getSupabase()
      .from('quotes')
      .select('id, number, title, status, client_name, schedule, body, deleted_at')
      .not('schedule', 'is', null)
      .is('deleted_at', null)
      .neq('status', 'draft'),
    'Odczyt terminów z harmonogramów',
  );

  const events: CalendarEvent[] = [];

  for (const row of rows as unknown as Row[]) {
    const schedule = parseScheduleBody(row.schedule);
    if (!schedule?.startDate) continue;

    const result = calcSchedule(schedule, roomsOf(row.body));
    // Bierzemy termin NAJPÓŹNIEJSZY: kalendarz ma pokazywać datę, której
    // pilnujemy wobec inwestora, a nie tę, która wyjdzie przy jego
    // natychmiastowych decyzjach.
    const day = result.endLatest;
    if (!day || day < range.from || day > range.to) continue;

    events.push({
      id: `deadline:${row.id as string}`,
      kind: 'deadline',
      day,
      time: null,
      title: (row.title as string) || (row.number as string) || '',
      subtitle: (row.client_name as string) || null,
      href: routes.quote(row.id as string),
    });
  }

  return events;
}

/** Pomieszczenia z treści wyceny — miękko, bo stara wycena ma prawo mieć inny kształt. */
function roomsOf(body: unknown): Room[] {
  if (!body || typeof body !== 'object') return [];
  const raw = (body as { rooms?: unknown }).rooms;
  if (!Array.isArray(raw)) return [];

  const rooms: Room[] = [];
  for (const item of raw) {
    const parsed = RoomSchema.safeParse(item);
    if (parsed.success) rooms.push(parsed.data);
  }
  if (rooms.length !== raw.length) log.warn('Pominięto nieczytelne pomieszczenia wyceny');
  return rooms;
}

/** Wszystkie zdarzenia widocznego zakresu — notatki dokłada warstwa zapytań. */
export async function listCalendarEvents(range: DayRange): Promise<CalendarEvent[]> {
  const [starts, visits, validity, deadlines] = await Promise.all([
    projectStarts(range),
    siteVisits(range),
    quoteValidity(range),
    scheduleDeadlines(range),
  ]);

  return [...starts, ...visits, ...validity, ...deadlines];
}
