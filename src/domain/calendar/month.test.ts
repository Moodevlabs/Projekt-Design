import { describe, expect, it } from 'vitest';

import {
  daysInMonth,
  firstDayOf,
  gridRange,
  groupByDay,
  isSameMonth,
  isWeekend,
  kindsOfDay,
  monthGrid,
  monthOf,
  shiftMonth,
  shortTime,
  todayIso,
} from './month';
import type { CalendarEvent } from './schema';

const event = (
  partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'kind' | 'day'>,
): CalendarEvent => ({
  id: `${partial.kind}:${partial.day}:${partial.title ?? ''}`,
  time: null,
  title: '',
  subtitle: null,
  href: null,
  ...partial,
});

describe('siatka miesiąca', () => {
  it('zaczyna tydzień w poniedziałek', () => {
    // 1 września 2026 to wtorek — pierwszy wiersz musi zacząć się 31 sierpnia.
    const weeks = monthGrid({ year: 2026, month: 9 });
    expect(weeks[0]?.[0]).toBe('2026-08-31');
    expect(weeks[0]?.[1]).toBe('2026-09-01');
  });

  it('ma zawsze sześć wierszy po siedem dni', () => {
    // Luty 2027 zaczyna się w poniedziałek i ma 28 dni — mieści się w czterech
    // tygodniach, a siatka i tak ma zostać sześciowierszowa.
    for (const ref of [
      { year: 2026, month: 9 },
      { year: 2027, month: 2 },
      { year: 2026, month: 12 },
    ]) {
      const weeks = monthGrid(ref);
      expect(weeks).toHaveLength(6);
      for (const week of weeks) expect(week).toHaveLength(7);
    }
  });

  it('kolejne dni siatki nie mają dziur ani powtórzeń', () => {
    const days = monthGrid({ year: 2026, month: 3 }).flat();
    expect(new Set(days).size).toBe(42);
  });

  it('zakres zapytania obejmuje całą widoczną siatkę', () => {
    const range = gridRange({ year: 2026, month: 9 });
    expect(range.from).toBe('2026-08-31');
    expect(range.to).toBe('2026-10-11');
  });
});

describe('arytmetyka miesięcy', () => {
  it('przesuwa przez granicę roku w obie strony', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 5 }, -17)).toEqual({ year: 2024, month: 12 });
  });

  it('liczy długość miesiąca razem z rokiem przestępnym', () => {
    expect(daysInMonth({ year: 2026, month: 2 })).toBe(28);
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(daysInMonth({ year: 2026, month: 9 })).toBe(30);
  });

  it('rozpoznaje miesiąc dnia i przynależność do miesiąca', () => {
    expect(monthOf('2026-09-01')).toEqual({ year: 2026, month: 9 });
    expect(firstDayOf({ year: 2026, month: 9 })).toBe('2026-09-01');
    expect(isSameMonth('2026-08-31', { year: 2026, month: 9 })).toBe(false);
    expect(isSameMonth('2026-09-30', { year: 2026, month: 9 })).toBe(true);
  });

  it('rozpoznaje weekend', () => {
    expect(isWeekend('2026-09-05')).toBe(true); // sobota
    expect(isWeekend('2026-09-06')).toBe(true); // niedziela
    expect(isWeekend('2026-09-07')).toBe(false); // poniedziałek
  });

  it('bierze dzisiejszy dzień z czasu lokalnego', () => {
    // 1 września o 01:00 czasu lokalnego to nadal 1 września, mimo że w UTC
    // trwa jeszcze sierpień.
    const local = new Date(2026, 8, 1, 1, 0, 0);
    expect(todayIso(local)).toBe('2026-09-01');
  });
});

describe('grupowanie zdarzeń', () => {
  const events: CalendarEvent[] = [
    event({ kind: 'quote_validity', day: '2026-09-10', title: 'Oferta' }),
    event({ kind: 'note', day: '2026-09-10', title: 'Montaż kuchni', time: '10:00' }),
    event({ kind: 'note', day: '2026-09-10', title: 'Odbiór płytek', time: '08:30' }),
    event({ kind: 'deadline', day: '2026-09-10', title: 'Termin oddania' }),
    event({ kind: 'site_visit', day: '2026-09-14', title: 'Wizja' }),
  ];

  it('zbiera zdarzenia po dniach', () => {
    const grouped = groupByDay(events);
    expect(grouped.get('2026-09-10')).toHaveLength(4);
    expect(grouped.get('2026-09-14')).toHaveLength(1);
    expect(grouped.get('2026-09-11')).toBeUndefined();
  });

  it('stawia notatki nad odczytami, a w nich sortuje po godzinie', () => {
    const day = groupByDay(events).get('2026-09-10') ?? [];
    expect(day.map((item) => item.title)).toEqual([
      'Odbiór płytek',
      'Montaż kuchni',
      'Termin oddania',
      'Oferta',
    ]);
  });

  it('rodzaje dnia są bez powtórzeń i w stałej kolejności', () => {
    const day = groupByDay(events).get('2026-09-10') ?? [];
    expect(kindsOfDay(day)).toEqual(['note', 'deadline', 'quote_validity']);
  });
});

describe('shortTime', () => {
  it('skraca godzinę z bazy do HH:MM', () => {
    expect(shortTime('09:30:00')).toBe('09:30');
    expect(shortTime('09:30')).toBe('09:30');
    expect(shortTime(null)).toBeNull();
    expect(shortTime('bez sensu')).toBeNull();
  });
});
