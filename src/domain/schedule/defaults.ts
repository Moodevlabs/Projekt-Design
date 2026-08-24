import { newId } from '../id';
import {
  ScheduleBodySchema,
  ScheduleStageSchema,
  type ScheduleBody,
  type ScheduleStage,
} from './schema';

/**
 * Domyślny szablon etapów (F5.1) — odwzorowanie arkusza `TERMIN - DOKUMENT`.
 *
 * To **punkt wyjścia do edycji**, a nie prawda o czyimś procesie. Liczby są
 * z arkusza klienta; każdy workspace nadpisuje je u siebie
 * (`workspaces.settings.scheduleTemplate`). Pusty harmonogram byłby gorszy:
 * nikt nie zaczyna planowania od czystej kartki, a jedenaście wierszy do
 * skreślenia jest łatwiejsze niż jedenaście do wymyślenia.
 *
 * `id` powstają przy każdym wywołaniu, bo etap jest bytem konkretnej wyceny —
 * dwa dokumenty nie mogą dzielić identyfikatora.
 */
export type StageTemplate = Omit<ScheduleStage, 'id'>;

const SZABLON: StageTemplate[] = [
  {
    name: 'Inwentaryzacja',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Rzuty funkcjonalne',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0.5,
    roomScope: 'all',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Wybór rzutu przez inwestora',
    owner: 'client',
    baseDays: 3,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Finalny rzut',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Spotkania',
    owner: 'client',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: ['meeting'],
  },
  {
    name: 'Zbieranie inspiracji',
    owner: 'client',
    baseDays: 5,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Moodboard',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'visual',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Wizualizacje 3D',
    owner: 'provider',
    baseDays: 0,
    perRoomDays: {},
    defaultPerRoomDays: 2,
    roomScope: 'visual',
    enabled: true,
    linkedItemTags: ['visualization'],
  },
  {
    name: 'Akceptacja wizualizacji',
    owner: 'client',
    baseDays: 0,
    perRoomDays: {},
    defaultPerRoomDays: 1,
    roomScope: 'visual',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Rysunki techniczne',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 1.5,
    roomScope: 'technical',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Teczka projektowa',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  },
  {
    name: 'Komunikacja projektowa',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: ['communication'],
  },
];

/**
 * Etapy szablonu ze świeżymi identyfikatorami.
 *
 * `template` pozwala podstawić własny szablon workspace'u
 * (`settings.scheduleTemplate`); `null` znaczy „użyj wbudowanego".
 */
export function defaultScheduleStages(template: StageTemplate[] | null = null): ScheduleStage[] {
  return (template ?? SZABLON).map((stage) => ({ ...stage, id: newId() }));
}

/**
 * Nowy etap harmonogramu.
 *
 * Czyta wymienione pola i przepuszcza wynik przez schemat — ta sama zasada co
 * w `newRoom`/`newDiscount`: akcje bywają podpinane wprost pod `onClick`,
 * a obiekt zdarzenia rozsypany do dokumentu psuje zapis.
 */
export function newStage(partial: Partial<ScheduleStage> = {}): ScheduleStage {
  const domyslny: ScheduleStage = {
    id: newId(),
    name: 'Nowy etap',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: true,
    linkedItemTags: [],
  };

  const kandydat: ScheduleStage = {
    ...domyslny,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.name === undefined ? {} : { name: partial.name }),
    ...(partial.owner === undefined ? {} : { owner: partial.owner }),
    ...(partial.baseDays === undefined ? {} : { baseDays: partial.baseDays }),
    ...(partial.perRoomDays === undefined ? {} : { perRoomDays: partial.perRoomDays }),
    ...(partial.defaultPerRoomDays === undefined
      ? {}
      : { defaultPerRoomDays: partial.defaultPerRoomDays }),
    ...(partial.roomScope === undefined ? {} : { roomScope: partial.roomScope }),
    ...(partial.enabled === undefined ? {} : { enabled: partial.enabled }),
    ...(partial.linkedItemTags === undefined ? {} : { linkedItemTags: partial.linkedItemTags }),
  };

  return ScheduleStageSchema.safeParse(kandydat).data ?? domyslny;
}

/** Nowy harmonogram wyceny z etapami z szablonu. */
export function newScheduleBody(
  partial: Partial<ScheduleBody> = {},
  template: StageTemplate[] | null = null,
): ScheduleBody {
  return ScheduleBodySchema.parse({ stages: defaultScheduleStages(template), ...partial });
}

/**
 * Harmonogram przeniesiony z szablonu do nowej wyceny (T-63).
 *
 * Data startu ZAWSZE wypada — należy do konkretnego projektu, nie do pakietu.
 * Szablon zapisany w marcu z marcową datą byłby pułapką, której nikt nie
 * zauważy przed wysłaniem oferty. Zerujemy i przy zapisie szablonu, i tutaj:
 * szablony sprzed T-63 mogą nieść datę z importu.
 */
export function scheduleFromTemplate(schedule: ScheduleBody | null): ScheduleBody | null {
  if (!schedule) return null;
  return { ...structuredClone(schedule), startDate: null };
}
