/**
 * Dni robocze i polskie święta (F5.1).
 *
 * **Bez zewnętrznej biblioteki świąt i bez `date-fns`** — wbrew sugestii
 * z `FEATURES`. Potrzebna tu arytmetyka to „dodaj dzień" i „jaki to dzień
 * tygodnia"; biblioteka dat byłaby kilkudziesięciokrotnie większa od tego,
 * co z niej weźmiemy, a lista świąt i tak wymaga własnego kodu (Wielkanoc).
 *
 * Wszystko liczymy na **UTC**, mimo że to daty bez godziny. Arytmetyka na
 * czasie lokalnym gubi albo dokłada dzień przy zmianie czasu, a przesunięcie
 * terminu oddania projektu o dobę dwa razy w roku to błąd, którego nikt nie
 * powiąże z DST.
 */

/** Data w formacie `YYYY-MM-DD` — tak samo jak `issueDate` w wycenie. */
export type IsoDate = string;

const DAY_MS = 86_400_000;

export function parseIsoDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Niedziela Wielkanocna (algorytm Meeusa/Jonesa/Butchera, kalendarz gregoriański).
 *
 * Wielkanoc jest ruchoma, więc cztery polskie dni wolne (sama Wielkanoc,
 * poniedziałek, Zielone Świątki i Boże Ciało) trzeba policzyć, a nie wypisać.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(Date.UTC(year, month - 1, day));
}

/** Dni wolne o stałej dacie (dzień, miesiąc licząc od 1). */
const STALE_SWIETA: [month: number, day: number][] = [
  [1, 1], // Nowy Rok
  [1, 6], // Trzech Króli
  [5, 1], // Święto Pracy
  [5, 3], // Święto Konstytucji 3 Maja
  [8, 15], // Wniebowzięcie NMP
  [11, 1], // Wszystkich Świętych
  [11, 11], // Święto Niepodległości
  [12, 25], // Boże Narodzenie
  [12, 26], // drugi dzień Bożego Narodzenia
];

/** Ile dni po Wielkanocy wypadają pozostałe dni wolne. */
const RUCHOME_SWIETA = [
  1, // Poniedziałek Wielkanocny
  49, // Zielone Świątki
  60, // Boże Ciało
];

const cache = new Map<number, Set<IsoDate>>();

/**
 * Polskie dni ustawowo wolne od pracy w danym roku.
 *
 * Wielkanoc i Zielone Świątki wypadają w niedzielę, więc przy pięciodniowym
 * tygodniu nic nie zmieniają — trzymamy je mimo to, bo przy sześcio-
 * i siedmiodniowym tygodniu już mają znaczenie.
 */
export function polishHolidays(year: number): Set<IsoDate> {
  const cached = cache.get(year);
  if (cached) return cached;

  const dni = new Set<IsoDate>();
  for (const [month, day] of STALE_SWIETA) {
    dni.add(toIsoDate(new Date(Date.UTC(year, month - 1, day))));
  }

  const easter = easterSunday(year);
  dni.add(toIsoDate(easter));
  for (const offset of RUCHOME_SWIETA) {
    dni.add(toIsoDate(addCalendarDays(easter, offset)));
  }

  cache.set(year, dni);
  return dni;
}

export interface WorkdayOptions {
  /**
   * Ile pierwszych dni tygodnia (od poniedziałku) jest roboczych.
   * `5` = pon–pt, `6` = pon–sob, `7` = cały tydzień.
   */
  workdaysPerWeek: number;
  /** `PL` uwzględnia dni ustawowo wolne; `none` liczy tylko dni tygodnia. */
  holidays: 'PL' | 'none';
}

/** Czy dany dzień jest roboczy przy zadanych zasadach. */
export function isWorkday(date: Date, options: WorkdayOptions): boolean {
  // `getUTCDay()` daje 0 dla niedzieli — przesuwamy tak, żeby poniedziałek
  // był zerem i dało się porównać z liczbą dni roboczych w tygodniu.
  const dzienTygodnia = (date.getUTCDay() + 6) % 7;
  if (dzienTygodnia >= options.workdaysPerWeek) return false;

  if (options.holidays === 'none') return true;
  return !polishHolidays(date.getUTCFullYear()).has(toIsoDate(date));
}

/** Ile dni naprzód szukamy, zanim uznamy zasady za sprzeczne. */
const MAX_KROKOW = 400;

/**
 * Data po `count` dniach roboczych od `start`.
 *
 * Odpowiednik `WORKDAY.INTL` z arkusza: **dzień startu się nie liczy**, a wynik
 * jest ostatnim policzonym dniem roboczym. `count = 0` zwraca datę startu bez
 * zmian, nawet jeśli sam start wypada w weekend — to punkt odniesienia, a nie
 * praca.
 *
 * Przy `workdaysPerWeek` mniejszym niż liczba dni wolnych w tygodniu pętla
 * mogłaby biec bez końca (np. tydzień jednodniowy trafiający zawsze w święto),
 * dlatego ma twardy limit kroków.
 */
export function addWorkdays(start: Date, count: number, options: WorkdayOptions): Date {
  if (count <= 0) return start;

  let date = start;
  let zostalo = Math.ceil(count);
  let kroki = 0;

  while (zostalo > 0) {
    date = addCalendarDays(date, 1);
    kroki += 1;

    if (isWorkday(date, options)) zostalo -= 1;

    if (kroki > MAX_KROKOW) {
      // Zasady nie do spełnienia — oddajemy to, co udało się policzyć,
      // zamiast zawieszać interfejs.
      break;
    }
  }

  return date;
}

/** Liczba dni kalendarzowych między dwiema datami (włącznie z dniem startu). */
export function calendarDaysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
}
