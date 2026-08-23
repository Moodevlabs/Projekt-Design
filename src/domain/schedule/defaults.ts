import { newId } from '../id';
import { ScheduleBodySchema, type ScheduleBody, type ScheduleStage } from './schema';

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

/** Nowy harmonogram wyceny z etapami z szablonu. */
export function newScheduleBody(
  partial: Partial<ScheduleBody> = {},
  template: StageTemplate[] | null = null,
): ScheduleBody {
  return ScheduleBodySchema.parse({ stages: defaultScheduleStages(template), ...partial });
}
