import { describe, expect, it } from 'vitest';
import {
  addWorkdays,
  calendarDaysBetween,
  easterSunday,
  isWorkday,
  parseIsoDate,
  polishHolidays,
  toIsoDate,
} from './workdays';

const PL5 = { workdaysPerWeek: 5, holidays: 'PL' as const };
const PL6 = { workdaysPerWeek: 6, holidays: 'PL' as const };
const BEZ_SWIAT = { workdaysPerWeek: 5, holidays: 'none' as const };

function dodaj(start: string, dni: number, opcje = PL5): string {
  return toIsoDate(addWorkdays(parseIsoDate(start), dni, opcje));
}

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2030, '2030-04-21'],
  ])('Wielkanoc %i to %s', (rok, data) => {
    expect(toIsoDate(easterSunday(rok))).toBe(data);
  });
});

describe('polskie święta', () => {
  it('zna dni wolne 2026, także ruchome', () => {
    const dni = polishHolidays(2026);

    // Stałe.
    expect(dni.has('2026-01-01')).toBe(true);
    expect(dni.has('2026-05-03')).toBe(true);
    expect(dni.has('2026-11-11')).toBe(true);
    expect(dni.has('2026-12-26')).toBe(true);

    // Ruchome: Wielkanoc 5 kwietnia.
    expect(dni.has('2026-04-06')).toBe(true); // Poniedziałek Wielkanocny
    expect(dni.has('2026-06-04')).toBe(true); // Boże Ciało
  });

  it('zna dni wolne 2027 — Wielkanoc wypada w marcu', () => {
    const dni = polishHolidays(2027);

    expect(dni.has('2027-03-29')).toBe(true); // Poniedziałek Wielkanocny
    expect(dni.has('2027-05-27')).toBe(true); // Boże Ciało
  });

  it('nie uznaje za wolne dnia, który nim nie jest', () => {
    expect(polishHolidays(2026).has('2026-04-07')).toBe(false);
  });
});

describe('isWorkday', () => {
  it('weekend nie jest roboczy przy pięciodniowym tygodniu', () => {
    // 2026-06-06 to sobota, 2026-06-07 niedziela.
    expect(isWorkday(parseIsoDate('2026-06-06'), PL5)).toBe(false);
    expect(isWorkday(parseIsoDate('2026-06-07'), PL5)).toBe(false);
    expect(isWorkday(parseIsoDate('2026-06-08'), PL5)).toBe(true);
  });

  it('przy sześciodniowym tygodniu sobota JEST robocza', () => {
    expect(isWorkday(parseIsoDate('2026-06-06'), PL6)).toBe(true);
    expect(isWorkday(parseIsoDate('2026-06-07'), PL6)).toBe(false);
  });

  it('święto nie jest robocze, nawet w środku tygodnia', () => {
    // Boże Ciało 2026 wypada w czwartek.
    expect(isWorkday(parseIsoDate('2026-06-04'), PL5)).toBe(false);
    // Bez świąt ten sam dzień się liczy.
    expect(isWorkday(parseIsoDate('2026-06-04'), BEZ_SWIAT)).toBe(true);
  });
});

describe('addWorkdays', () => {
  it('dzień startu się NIE liczy — jak `WORKDAY` w arkuszu', () => {
    // Poniedziałek + 1 dzień roboczy = wtorek.
    expect(dodaj('2026-06-08', 1)).toBe('2026-06-09');
  });

  it('zero dni zwraca datę startu bez zmian', () => {
    // Punkt odniesienia, a nie praca — nawet gdy start wypada w weekend.
    expect(dodaj('2026-06-06', 0)).toBe('2026-06-06');
  });

  it('przeskakuje weekend', () => {
    // Piątek + 1 = poniedziałek.
    expect(dodaj('2026-06-05', 1)).toBe('2026-06-08');
    // Piątek + 5 = następny piątek.
    expect(dodaj('2026-06-05', 5)).toBe('2026-06-12');
  });

  it('przeskakuje święto', () => {
    // Środa 3 czerwca + 1: czwartek 4 to Boże Ciało, więc wychodzi piątek.
    expect(dodaj('2026-06-03', 1)).toBe('2026-06-05');
  });

  it('PRZECHODZI PRZEZ ROK, licząc święta obu lat', () => {
    /*
     * Grudzień ma dwa dni wolne pod koniec, a styczeń dwa na początku.
     * Liczenie świąt tylko z roku startu zwróciłoby termin o kilka dni
     * za wcześnie — i to w najgorszym możliwym miejscu, bo przełom roku
     * to typowy start projektu.
     */
    // 2026-12-21 to poniedziałek. Wolne: 25, 26 XII oraz 1, 6 I.
    expect(dodaj('2026-12-21', 10)).toBe('2027-01-07');
  });

  it('sześciodniowy tydzień inwestora skraca termin', () => {
    // Ten sam start i ta sama liczba dni — sobota wchodzi do puli.
    expect(dodaj('2026-06-08', 6, PL5)).toBe('2026-06-16');
    expect(dodaj('2026-06-08', 6, PL6)).toBe('2026-06-15');
  });

  it('siedmiodniowy tydzień liczy też niedziele, ale nadal omija święta', () => {
    const pl7 = { workdaysPerWeek: 7, holidays: 'PL' as const };
    expect(dodaj('2026-06-05', 2, pl7)).toBe('2026-06-07');
    // 2026-08-14 piątek + 1: 15 sierpnia to święto, więc 16.
    expect(dodaj('2026-08-14', 1, pl7)).toBe('2026-08-16');
  });

  it('nie zawiesza się przy zasadach nie do spełnienia', () => {
    // Jednodniowy tydzień plus święta potrafi dać ciąg bez dnia roboczego.
    const wynik = dodaj('2026-01-01', 400, { workdaysPerWeek: 1, holidays: 'PL' });
    expect(typeof wynik).toBe('string');
  });
});

describe('calendarDaysBetween', () => {
  it('liczy dni włącznie z dniem startu', () => {
    expect(calendarDaysBetween(parseIsoDate('2026-06-01'), parseIsoDate('2026-06-01'))).toBe(1);
    expect(calendarDaysBetween(parseIsoDate('2026-06-01'), parseIsoDate('2026-06-08'))).toBe(8);
  });

  it('nie gubi dnia przy zmianie czasu', () => {
    /*
     * Zmiana czasu w Polsce wypada w ostatnią niedzielę marca i października.
     * Arytmetyka na czasie lokalnym daje wtedy 23 albo 25 godzin i potrafi
     * zgubić dzień — dlatego cały moduł liczy na UTC.
     */
    expect(calendarDaysBetween(parseIsoDate('2026-03-28'), parseIsoDate('2026-03-30'))).toBe(3);
    expect(calendarDaysBetween(parseIsoDate('2026-10-24'), parseIsoDate('2026-10-26'))).toBe(3);
  });
});
