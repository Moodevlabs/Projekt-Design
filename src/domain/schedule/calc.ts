import { addWorkdays, calendarDaysBetween, parseIsoDate, toIsoDate } from '../dates/workdays';
import type { Room, RoomScope } from '../quote/schema';
import type { ScheduleBody, ScheduleStage } from './schema';

/** Wynik jednego etapu — do tabeli i do paska w UI. */
export interface StageResult {
  stageId: string;
  name: string;
  owner: ScheduleStage['owner'];
  /** Dni robocze tego etapu (0, gdy wyłączony). */
  days: number;
}

export interface ScheduleResult {
  /** Suma dni roboczych po stronie wykonawcy. */
  providerDays: number;
  /** Suma dni roboczych po stronie inwestora. */
  clientDays: number;
  /**
   * Zgrubny przelicznik dni roboczych na kalendarzowe (arkusz `O39`:
   * `dni / 5 × 7`). Dostępny także bez daty startu — stąd „zgrubny": nie zna
   * świąt ani tego, w jaki dzień tygodnia projekt się zaczyna.
   */
  calendarDaysOptimal: number;
  calendarDaysLatest: number;
  /**
   * Termin liczony **dniami roboczymi po kalendarzu**, ze świętami.
   * `null` bez daty startu — nie zgadujemy, kiedy projekt się zaczyna.
   */
  endOptimal: string | null;
  endLatest: string | null;
  perStage: StageResult[];
}

/** Czy pomieszczenie liczy się do etapu o danym zasięgu. */
function roomInScope(room: Room, scope: RoomScope | 'none'): boolean {
  if (scope === 'none') return false;
  if (scope === 'visual') return room.includedInVisual;
  if (scope === 'technical') return room.includedInTechnical;
  return true;
}

/**
 * Dni jednego etapu: baza plus składnik za pomieszczenia.
 *
 * `room.qty` mnoży składnik — „salon x2" to dwa pomieszczenia do narysowania,
 * więc i dwa razy tyle pracy. Ta sama zasada co w cenniku parametrycznym.
 */
export function calcStageDays(stage: ScheduleStage, rooms: Room[]): number {
  if (!stage.enabled) return 0;

  const perRoom = rooms
    .filter((room) => roomInScope(room, stage.roomScope))
    .reduce((sum, room) => {
      const stawka =
        room.roomTypeId === null
          ? stage.defaultPerRoomDays
          : (stage.perRoomDays[room.roomTypeId] ?? stage.defaultPerRoomDays);
      return sum + stawka * room.qty;
    }, 0);

  return stage.baseDays + perRoom;
}

/** Zgrubny przelicznik: ile dni kalendarzowych zajmie `days` dni roboczych. */
function toCalendarDays(days: number, workdaysPerWeek: number): number {
  if (days <= 0) return 0;
  return Math.ceil((days / workdaysPerWeek) * 7);
}

/**
 * Wyliczenie harmonogramu (F5.1).
 *
 * Dwa terminy, bo taki jest sens arkusza:
 *
 *  - **optymalny** — liczymy tylko dni wykonawcy. Tyle zajmie projekt, jeśli
 *    inwestor odpowiada natychmiast.
 *  - **najpóźniejszy** — dni wykonawcy plus dni inwestora, jedne po drugich.
 *    Każda strona chodzi po **swoim** tygodniu roboczym, bo inwestor bywa
 *    dostępny w soboty, a wykonawca nie (albo odwrotnie).
 *
 * Rzeczywistość leży gdzieś pomiędzy — te dwie daty mają pokazać widełki,
 * a nie obiecać konkretny dzień. Podanie jednej liczby byłoby obietnicą,
 * której nikt nie kontroluje w całości.
 *
 * **Świadome uproszczenie:** dni obu stron sumujemy sekwencyjnie, zamiast
 * modelować zależności między etapami. Arkusz robi to samo, a pełny graf
 * zależności to osobny produkt, nie pole w wycenie.
 */
export function calcSchedule(schedule: ScheduleBody, rooms: Room[]): ScheduleResult {
  const perStage: StageResult[] = schedule.stages.map((stage) => ({
    stageId: stage.id,
    name: stage.name,
    owner: stage.owner,
    days: calcStageDays(stage, rooms),
  }));

  const sum = (owner: ScheduleStage['owner']) =>
    perStage
      .filter((stage) => stage.owner === owner)
      .reduce((total, stage) => total + stage.days, 0);

  const providerDays = sum('provider');
  const clientDays = sum('client');

  const calendarDaysOptimal = toCalendarDays(providerDays, schedule.providerWorkdaysPerWeek);
  const calendarDaysLatest =
    calendarDaysOptimal + toCalendarDays(clientDays, schedule.clientWorkdaysPerWeek);

  const { endOptimal, endLatest } = calcEnds(schedule, providerDays, clientDays);

  return {
    providerDays,
    clientDays,
    calendarDaysOptimal,
    calendarDaysLatest,
    endOptimal,
    endLatest,
    perStage,
  };
}

function calcEnds(
  schedule: ScheduleBody,
  providerDays: number,
  clientDays: number,
): { endOptimal: string | null; endLatest: string | null } {
  if (!schedule.startDate) return { endOptimal: null, endLatest: null };

  const start = parseIsoDate(schedule.startDate);
  const providerOpts = {
    workdaysPerWeek: schedule.providerWorkdaysPerWeek,
    holidays: schedule.holidays,
  };

  const optimal = addWorkdays(start, providerDays, providerOpts);
  // Dni inwestora doliczamy OD terminu optymalnego i po JEGO tygodniu —
  // inaczej sobota inwestora liczyłaby się według kalendarza wykonawcy.
  const latest = addWorkdays(optimal, clientDays, {
    workdaysPerWeek: schedule.clientWorkdaysPerWeek,
    holidays: schedule.holidays,
  });

  return { endOptimal: toIsoDate(optimal), endLatest: toIsoDate(latest) };
}

/**
 * Ile dni kalendarzowych naprawdę zajmie projekt — od startu do podanego końca.
 *
 * Różni się od `calendarDays*`, bo tamte są zgrubnym przelicznikiem z arkusza
 * (`dni / 5 × 7`) i nie znają świąt. Ta liczba jest prawdziwa, ale wymaga daty
 * startu. Obie zostają, bo służą do czego innego: przelicznik działa przy
 * planowaniu „ile to potrwa", a ta — gdy termin jest już konkretny.
 */
export function realCalendarDays(startDate: string | null, end: string | null): number | null {
  if (!startDate || !end) return null;
  return calendarDaysBetween(parseIsoDate(startDate), parseIsoDate(end));
}
