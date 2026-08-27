import { addCalendarDays, parseIsoDate, toIsoDate } from '../dates/workdays';
import type { CalendarEvent, DayRange, IsoDay } from './schema';
import { CALENDAR_EVENT_KINDS } from './schema';

/**
 * Siatka miesiąca (T-98).
 *
 * ## Tydzień zaczyna się w poniedziałek
 *
 * Kalendarz czyta osoba pracująca w Polsce, dla której tydzień roboczy zaczyna
 * się w poniedziałek, a weekend stoi na końcu wiersza. Siatka od niedzieli
 * rozbija weekend na dwa końce rzędu i wymaga liczenia oczami.
 *
 * ## Wszystko na UTC
 *
 * Ta sama zasada co w `dates/workdays`: to są daty bez godziny, a arytmetyka
 * na czasie lokalnym gubi albo dokłada dzień przy zmianie czasu. Kalendarz,
 * który dwa razy w roku przesuwa wpisy o dobę, jest gorszy niż jego brak.
 */

/** Miesiąc jako para liczb. `month` liczony od 1, jak w zapisie daty. */
export interface MonthRef {
  year: number;
  month: number;
}

const WEEK = 7;

export function monthOf(day: IsoDay): MonthRef {
  const date = parseIsoDate(day);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function todayIso(now: Date = new Date()): IsoDay {
  // Dzień „dzisiejszy" bierzemy z czasu LOKALNEGO, a nie z UTC: dla użytkownika
  // w Polsce 1 września o 01:00 to wciąż 1 września, choć w UTC jest jeszcze
  // sierpień. Dalsza arytmetyka idzie już po UTC, bo operuje na samej dacie.
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const zeroBased = ref.month - 1 + delta;
  const year = ref.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return { year, month: month + 1 };
}

/** Pierwszy dzień miesiąca jako `YYYY-MM-DD`. */
export function firstDayOf(ref: MonthRef): IsoDay {
  return `${ref.year}-${`${ref.month}`.padStart(2, '0')}-01`;
}

/** Ile dni ma miesiąc — bez tablicy i bez roku przestępnego w kodzie. */
export function daysInMonth(ref: MonthRef): number {
  return new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
}

/**
 * Siatka sześciu tygodni po siedem dni.
 *
 * Zawsze SZEŚĆ wierszy, także gdy miesiąc mieści się w pięciu. Siatka
 * zmieniająca wysokość przy przewijaniu miesięcy podskakuje pod kursorem
 * i przesuwa panel dnia pod spodem.
 */
export function monthGrid(ref: MonthRef): IsoDay[][] {
  const first = parseIsoDate(firstDayOf(ref));
  // `getUTCDay()`: 0 = niedziela. Przesunięcie na tydzień od poniedziałku.
  const offset = (first.getUTCDay() + 6) % 7;
  const start = addCalendarDays(first, -offset);

  const weeks: IsoDay[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const days: IsoDay[] = [];
    for (let day = 0; day < WEEK; day += 1) {
      days.push(toIsoDate(addCalendarDays(start, week * WEEK + day)));
    }
    weeks.push(days);
  }
  return weeks;
}

/** Zakres zapytania: cała widoczna siatka, nie sam miesiąc. */
export function gridRange(ref: MonthRef): DayRange {
  const weeks = monthGrid(ref);
  const first = weeks[0]?.[0];
  const last = weeks[weeks.length - 1]?.[WEEK - 1];
  return { from: first ?? firstDayOf(ref), to: last ?? firstDayOf(ref) };
}

export function isSameMonth(day: IsoDay, ref: MonthRef): boolean {
  const month = monthOf(day);
  return month.year === ref.year && month.month === ref.month;
}

/**
 * Dzień tygodnia liczony od PONIEDZIAŁKU: 0 = poniedziałek, 6 = niedziela.
 *
 * `Date.getUTCDay()` liczy od niedzieli, więc każde miejsce, które chce
 * kolumny siatki albo nazwę dnia, musiałoby powtarzać to samo przesunięcie —
 * i wystarczy pomylić się raz, żeby kalendarz zaczął się w niedzielę.
 */
export function weekdayIndex(day: IsoDay): number {
  return (parseIsoDate(day).getUTCDay() + 6) % 7;
}

/** Sobota albo niedziela — do wygaszenia kratki, nie do blokowania czegokolwiek. */
export function isWeekend(day: IsoDay): boolean {
  return weekdayIndex(day) >= 5;
}

/**
 * Niedziela osobno od soboty.
 *
 * W polskich kalendarzach niedziela jest czerwona, a sobota tylko wygaszona —
 * to nie ozdobnik, tylko utrwalona konwencja: dzień ustawowo wolny od pracy
 * czyta się inaczej niż dzień wolny umownie.
 */
export function isSunday(day: IsoDay): boolean {
  return weekdayIndex(day) === 6;
}

/**
 * Zdarzenia pogrupowane po dniu i posortowane w obrębie dnia.
 *
 * Kolejność: najpierw notatki (ktoś je tam wpisał świadomie), potem odczyty
 * z reszty aplikacji w kolejności `CALENDAR_EVENT_KINDS`. Wpisy z godziną
 * stoją przed bezgodzinowymi w obrębie tego samego rodzaju.
 */
export function groupByDay(events: readonly CalendarEvent[]): Map<IsoDay, CalendarEvent[]> {
  const order = new Map(CALENDAR_EVENT_KINDS.map((kind, index) => [kind, index]));
  const grouped = new Map<IsoDay, CalendarEvent[]>();

  for (const event of events) {
    const list = grouped.get(event.day);
    if (list) list.push(event);
    else grouped.set(event.day, [event]);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => {
      const byKind = (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0);
      if (byKind !== 0) return byKind;
      if (a.time !== b.time) {
        if (a.time === null) return 1;
        if (b.time === null) return -1;
        return a.time.localeCompare(b.time);
      }
      return a.title.localeCompare(b.title, 'pl');
    });
  }

  return grouped;
}

/**
 * Rodzaje zdarzeń danego dnia, bez powtórzeń, w stałej kolejności.
 *
 * To z tego powstają kropki w kratce: kratka mówi CO tam jest, a nie ile —
 * trzy kropki „termin" nie niosą więcej niż jedna, a zajmują trzy razy tyle
 * miejsca w siatce, która ma zostać czytelna.
 */
export function kindsOfDay(events: readonly CalendarEvent[]): CalendarEvent['kind'][] {
  const present = new Set(events.map((event) => event.kind));
  return CALENDAR_EVENT_KINDS.filter((kind) => present.has(kind));
}

/** Godzina z bazy (`HH:MM:SS`) skrócona do `HH:MM`. `null` zostaje `null`. */
export function shortTime(time: string | null): string | null {
  if (time === null) return null;
  const match = /^(\d{2}:\d{2})/.exec(time);
  return match?.[1] ?? null;
}
