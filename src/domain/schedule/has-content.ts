import type { ScheduleBody } from './schema';

/**
 * Czy harmonogram ma TREŚĆ, a nie tylko istnieje (T-115).
 *
 * Od T-111 zakładka „Termin" startuje pusta: samo wejście na nią zakłada
 * powłokę `{ stages: [] }`, żeby dało się dodawać etapy. Taka powłoka nie jest
 * dokumentem — nie ma jej w PDF, w pakiecie, na stronie dla inwestora ani
 * w szablonie. Każde „czy wycena ma termin?" ma pytać tą funkcją, a nie
 * `schedule !== null`.
 */
export function scheduleHasContent(schedule: ScheduleBody | null | undefined): boolean {
  return Boolean(schedule && schedule.stages.length > 0);
}
