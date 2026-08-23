import { describe, expect, it } from 'vitest';
import { calcSchedule, calcStageDays, realCalendarDays } from './calc';
import { newScheduleBody } from './defaults';
import { ScheduleStageSchema, type ScheduleStage } from './schema';
import type { Room } from '../quote/schema';

function stage(partial: Partial<ScheduleStage> & { name: string }): ScheduleStage {
  return ScheduleStageSchema.parse({
    id: '00000000-0000-4000-8000-0000000000' + String(partial.name.length).padStart(2, '0'),
    owner: 'provider',
    ...partial,
  });
}

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: `r-${partial.label}`,
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

const KUCHNIA = room({ label: 'kuchnia', roomTypeId: 'rt-kuchnia' });
const SALON = room({ label: 'salon', roomTypeId: 'rt-salon', qty: 2 });
const LAZIENKA = room({ label: 'łazienka', roomTypeId: 'rt-lazienka', includedInVisual: false });

describe('calcStageDays', () => {
  it('etap niezależny od pomieszczeń liczy samą bazę', () => {
    const etap = stage({ name: 'Inwentaryzacja', baseDays: 2, roomScope: 'none' });
    expect(calcStageDays(etap, [KUCHNIA, SALON])).toBe(2);
  });

  it('dolicza dni za pomieszczenia, mnożąc przez ich ilość', () => {
    // „salon x2" to dwa pomieszczenia do narysowania, więc dwa razy tyle pracy.
    const etap = stage({ name: 'Rzuty', baseDays: 1, defaultPerRoomDays: 0.5, roomScope: 'all' });
    expect(calcStageDays(etap, [KUCHNIA, SALON])).toBe(1 + 0.5 + 0.5 * 2);
  });

  it('stawka per typ pomieszczenia bije domyślną', () => {
    const etap = stage({
      name: 'Rysunki',
      perRoomDays: { 'rt-kuchnia': 3 },
      defaultPerRoomDays: 1,
      roomScope: 'all',
    });

    expect(calcStageDays(etap, [KUCHNIA, SALON])).toBe(3 + 1 * 2);
  });

  it('zasięg `visual` pomija pomieszczenia bez tej flagi', () => {
    // Ten sam zasięg co w cenniku parametrycznym — termin i cena mają
    // obejmować dokładnie te same pomieszczenia.
    const etap = stage({ name: 'Wizualizacje', defaultPerRoomDays: 2, roomScope: 'visual' });
    expect(calcStageDays(etap, [KUCHNIA, LAZIENKA])).toBe(2);
  });

  it('wyłączony etap to zero dni, nawet gdy ma stawki', () => {
    const etap = stage({ name: 'Moodboard', baseDays: 5, enabled: false });
    expect(calcStageDays(etap, [KUCHNIA])).toBe(0);
  });

  it('pomieszczenie bez typu bierze stawkę domyślną', () => {
    const bezTypu = room({ label: 'strych' });
    const etap = stage({
      name: 'Rzuty',
      perRoomDays: { 'rt-kuchnia': 5 },
      defaultPerRoomDays: 1,
      roomScope: 'all',
    });

    expect(calcStageDays(etap, [bezTypu])).toBe(1);
  });
});

describe('calcSchedule — sumy', () => {
  const schedule = newScheduleBody({
    startDate: null,
    stages: [
      stage({ name: 'Rzuty', owner: 'provider', baseDays: 10 }),
      stage({ name: 'Teczka', owner: 'provider', baseDays: 5 }),
      stage({ name: 'Decyzje', owner: 'client', baseDays: 7 }),
    ],
  });

  it('rozdziela dni wykonawcy i inwestora', () => {
    // Inwestor też „zużywa" czas — bez tego rozróżnienia termin wychodzi
    // optymistyczny w sposób, którego potem nie da się wytłumaczyć.
    const wynik = calcSchedule(schedule, []);

    expect(wynik.providerDays).toBe(15);
    expect(wynik.clientDays).toBe(7);
  });

  it('przelicza dni robocze na kalendarzowe wzorem z arkusza (dni / 5 × 7)', () => {
    const wynik = calcSchedule(schedule, []);

    expect(wynik.calendarDaysOptimal).toBe(Math.ceil((15 / 5) * 7));
    expect(wynik.calendarDaysLatest).toBe(21 + Math.ceil((7 / 5) * 7));
  });

  it('KAŻDA strona liczy po swoim tygodniu roboczym', () => {
    // Inwestor bywa dostępny w soboty, wykonawca nie. Wspólny przelicznik
    // zacierałby właśnie tę różnicę.
    const szescDniowy = newScheduleBody({ ...schedule, clientWorkdaysPerWeek: 6 });
    const wynik = calcSchedule(szescDniowy, []);

    expect(wynik.calendarDaysLatest).toBe(21 + Math.ceil((7 / 6) * 7));
  });

  it('zwraca rozbicie na etapy w kolejności z dokumentu', () => {
    const wynik = calcSchedule(schedule, []);

    expect(wynik.perStage.map((s) => [s.name, s.days])).toEqual([
      ['Rzuty', 10],
      ['Teczka', 5],
      ['Decyzje', 7],
    ]);
  });
});

describe('calcSchedule — terminy', () => {
  const schedule = newScheduleBody({
    // 2026-06-01 to poniedziałek.
    startDate: '2026-06-01',
    stages: [
      stage({ name: 'Praca', owner: 'provider', baseDays: 10 }),
      stage({ name: 'Decyzje', owner: 'client', baseDays: 5 }),
    ],
  });

  it('optymalny termin liczy TYLKO dni wykonawcy', () => {
    // Tyle zajmie projekt, jeśli inwestor odpowiada natychmiast.
    // 10 dni roboczych od poniedziałku 1 VI, z Bożym Ciałem 4 VI.
    expect(calcSchedule(schedule, []).endOptimal).toBe('2026-06-16');
  });

  it('najpóźniejszy dokłada dni inwestora PO terminie optymalnym', () => {
    expect(calcSchedule(schedule, []).endLatest).toBe('2026-06-23');
  });

  it('bez daty startu NIE zgaduje terminów', () => {
    // Dni policzyć się da zawsze, ale kiedy projekt się zacznie — nie.
    const bezStartu = newScheduleBody({ ...schedule, startDate: null });
    const wynik = calcSchedule(bezStartu, []);

    expect(wynik.endOptimal).toBeNull();
    expect(wynik.endLatest).toBeNull();
    // Same dni i przelicznik zostają dostępne.
    expect(wynik.providerDays).toBe(10);
    expect(wynik.calendarDaysOptimal).toBe(14);
  });

  it('sześciodniowy tydzień inwestora skraca najpóźniejszy termin', () => {
    const szescDniowy = newScheduleBody({ ...schedule, clientWorkdaysPerWeek: 6 });
    const wynik = calcSchedule(szescDniowy, []);

    expect(wynik.endOptimal).toBe('2026-06-16');
    expect(new Date(wynik.endLatest!).getTime()).toBeLessThan(new Date('2026-06-23').getTime());
  });

  it('wyłączenie świąt daje termin wcześniejszy', () => {
    // Kontrola, że święta faktycznie wchodzą do rachunku, a nie tylko
    // siedzą w konfiguracji.
    const bezSwiat = newScheduleBody({ ...schedule, holidays: 'none' });
    expect(calcSchedule(bezSwiat, []).endOptimal).toBe('2026-06-15');
  });

  it('pusty harmonogram kończy się w dniu startu', () => {
    const pusty = newScheduleBody({ startDate: '2026-06-01', stages: [] });
    const wynik = calcSchedule(pusty, []);

    expect(wynik.endOptimal).toBe('2026-06-01');
    expect(wynik.calendarDaysOptimal).toBe(0);
  });
});

describe('realCalendarDays', () => {
  it('liczy prawdziwą długość projektu, nie przelicznik', () => {
    // Przelicznik z arkusza (`dni / 5 × 7`) nie zna świąt; ta liczba tak.
    expect(realCalendarDays('2026-06-01', '2026-06-16')).toBe(16);
  });

  it('bez dat zwraca null', () => {
    expect(realCalendarDays(null, '2026-06-16')).toBeNull();
    expect(realCalendarDays('2026-06-01', null)).toBeNull();
  });
});

describe('szablon etapów', () => {
  it('daje jedenaście etapów z arkusza i obie strony', () => {
    const schedule = newScheduleBody();
    const owners = new Set(schedule.stages.map((s) => s.owner));

    expect(schedule.stages.length).toBeGreaterThanOrEqual(11);
    expect(owners).toEqual(new Set(['provider', 'client']));
  });

  it('każde wywołanie daje ŚWIEŻE identyfikatory', () => {
    // Etap należy do konkretnej wyceny — wspólne `id` znaczyłoby, że edycja
    // jednego harmonogramu rusza drugi.
    const a = newScheduleBody().stages.map((s) => s.id);
    const b = newScheduleBody().stages.map((s) => s.id);

    expect(a).not.toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it('etapy zależne od pomieszczeń mają zasięg, reszta `none`', () => {
    const schedule = newScheduleBody();
    for (const etap of schedule.stages) {
      const zalezny = etap.defaultPerRoomDays > 0 || Object.keys(etap.perRoomDays).length > 0;
      if (zalezny) expect(etap.roomScope, etap.name).not.toBe('none');
    }
  });
});
