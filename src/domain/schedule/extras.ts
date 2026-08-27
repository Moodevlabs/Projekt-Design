import { newId } from '../id';
import type { ScheduleBody, ScheduleExtra, ScheduleStage } from './schema';

/**
 * Usługi dodatkowe w harmonogramie (T-64).
 *
 * Dni z cennika dodatkowego trafiają do **jednego etapu zbiorczego**, a nie
 * rozsmarowane po istniejących etapach. To ta sama zasada co przy rabatach na
 * sekcje (T-37): użytkownik ma widzieć, skąd wzięło się „+5 dni", a nie
 * odkrywać, że inwentaryzacja nagle trwa dłużej.
 *
 * Etap trzyma **listę składników**, a `baseDays` jest ich sumą. Suma bez listy
 * byłaby prawdziwa i nieczytelna miesiąc później.
 */

/** Etap zbiorczy tej wyceny — `null`, gdy jeszcze go nie ma. */
export function findExtrasStage(schedule: ScheduleBody | null): ScheduleStage | null {
  return schedule?.stages.find((stage) => stage.kind === 'extras') ?? null;
}

/** Suma dni składników. Źródło prawdy dla `baseDays` etapu zbiorczego. */
export function extrasDays(extras: ScheduleExtra[]): number {
  return extras.reduce((sum, extra) => sum + extra.days, 0);
}

/**
 * Harmonogram z dołożoną usługą dodatkową.
 *
 * Nowy etap dostaje `owner: 'provider'` i `roomScope: 'none'`: dni z cennika
 * są pracą wykonawcy i nie zależą od liczby pomieszczeń. Ta sama usługa dodana
 * dwa razy pojawia się dwa razy — bo dwie panoramy to dwa razy tyle roboty.
 *
 * `stageName` przychodzi z zewnątrz, bo domena nie zna i18n.
 */
export function withExtra(
  schedule: ScheduleBody,
  extra: { name: string; days: number },
  stageName: string,
): ScheduleBody {
  const nowy: ScheduleExtra = { id: newId(), name: extra.name, days: Math.max(0, extra.days) };
  const istniejacy = findExtrasStage(schedule);

  if (!istniejacy) {
    const stage: ScheduleStage = {
      id: newId(),
      name: stageName,
      kind: 'extras',
      extras: [nowy],
      owner: 'provider',
      baseDays: nowy.days,
      perRoomDays: {},
      defaultPerRoomDays: 0,
      roomScope: 'none',
      enabled: true,
      linkedItemTags: [],
    };
    return { ...schedule, stages: [...schedule.stages, stage] };
  }

  const extras = [...istniejacy.extras, nowy];
  return {
    ...schedule,
    stages: schedule.stages.map((stage) =>
      stage.id === istniejacy.id ? { ...stage, extras, baseDays: extrasDays(extras) } : stage,
    ),
  };
}

/**
 * Harmonogram bez wskazanego składnika.
 *
 * Pusty etap zbiorczy **znika**. Zostawienie „Usługi dodatkowe: 0 dni"
 * wyglądałoby na pomyłkę, a nie na świadomy stan — a użytkownik i tak może
 * wyłączyć etap zamiast kasować składniki.
 */
export function withoutExtra(schedule: ScheduleBody, extraId: string): ScheduleBody {
  const stage = findExtrasStage(schedule);
  if (!stage) return schedule;

  const extras = stage.extras.filter((extra) => extra.id !== extraId);
  if (extras.length === 0) {
    return {
      ...schedule,
      stages: schedule.stages.filter((candidate) => candidate.id !== stage.id),
    };
  }

  return {
    ...schedule,
    stages: schedule.stages.map((candidate) =>
      candidate.id === stage.id
        ? { ...candidate, extras, baseDays: extrasDays(extras) }
        : candidate,
    ),
  };
}

/** Harmonogram ze zmienioną liczbą dni jednego składnika. */
export function withExtraDays(schedule: ScheduleBody, extraId: string, days: number): ScheduleBody {
  const stage = findExtrasStage(schedule);
  if (!stage) return schedule;

  const extras = stage.extras.map((extra) =>
    extra.id === extraId ? { ...extra, days: Math.max(0, Math.round(days)) } : extra,
  );

  return {
    ...schedule,
    stages: schedule.stages.map((candidate) =>
      candidate.id === stage.id
        ? { ...candidate, extras, baseDays: extrasDays(extras) }
        : candidate,
    ),
  };
}
