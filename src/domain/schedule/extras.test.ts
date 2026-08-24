import { describe, expect, it } from 'vitest';
import { newScheduleBody } from './defaults';
import { calcSchedule } from './calc';
import { extrasDays, findExtrasStage, withExtra, withExtraDays, withoutExtra } from './extras';

const NAZWA = 'Usługi dodatkowe';

/** Pusty harmonogram — bez etapów z szablonu, żeby liczyć samo `extras`. */
function pusty() {
  return newScheduleBody({ stages: [], startDate: null });
}

describe('withExtra', () => {
  it('zaklada etap zbiorczy przy pierwszej usludze', () => {
    const schedule = withExtra(pusty(), { name: 'Panorama 360', days: 3 }, NAZWA);
    const stage = findExtrasStage(schedule);

    expect(stage?.name).toBe(NAZWA);
    expect(stage?.kind).toBe('extras');
    expect(stage?.baseDays).toBe(3);
    expect(stage?.extras).toHaveLength(1);
  });

  it('dni ida na konto WYKONAWCY i nie zaleza od pomieszczen', () => {
    // Inaczej "+3 dni" rosloby razem z liczba pokoi, czego nikt nie prosil.
    const stage = findExtrasStage(withExtra(pusty(), { name: 'Rzut', days: 3 }, NAZWA));

    expect(stage?.owner).toBe('provider');
    expect(stage?.roomScope).toBe('none');
  });

  it('druga usluga dopisuje sie do TEGO SAMEGO etapu', () => {
    let schedule = withExtra(pusty(), { name: 'Panorama 360', days: 3 }, NAZWA);
    schedule = withExtra(schedule, { name: 'Kład ściany', days: 2 }, NAZWA);

    expect(schedule.stages.filter((stage) => stage.kind === 'extras')).toHaveLength(1);
    expect(findExtrasStage(schedule)?.baseDays).toBe(5);
  });

  it('ta sama usluga dodana dwa razy liczy sie dwa razy', () => {
    // Dwie panoramy to dwa razy tyle roboty — deduplikacja bylaby zgadywaniem.
    let schedule = withExtra(pusty(), { name: 'Panorama 360', days: 3 }, NAZWA);
    schedule = withExtra(schedule, { name: 'Panorama 360', days: 3 }, NAZWA);

    expect(findExtrasStage(schedule)?.extras).toHaveLength(2);
    expect(findExtrasStage(schedule)?.baseDays).toBe(6);
  });

  it('nie rusza istniejacych etapow', () => {
    const zEtapami = newScheduleBody({ startDate: null });
    const ile = zEtapami.stages.length;

    const schedule = withExtra(zEtapami, { name: 'Panorama', days: 3 }, NAZWA);
    expect(schedule.stages).toHaveLength(ile + 1);
  });
});

describe('withoutExtra', () => {
  it('zdejmuje dni jednej uslugi, reszte zostawia', () => {
    let schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    schedule = withExtra(schedule, { name: 'Rzut', days: 2 }, NAZWA);
    const panorama = findExtrasStage(schedule)?.extras[0];

    const bez = withoutExtra(schedule, panorama?.id ?? '');
    expect(findExtrasStage(bez)?.extras).toHaveLength(1);
    expect(findExtrasStage(bez)?.baseDays).toBe(2);
  });

  it('pusty etap zbiorczy ZNIKA', () => {
    // "Usługi dodatkowe: 0 dni" wygladalyby na pomylke, a nie na swiadomy stan.
    const schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    const id = findExtrasStage(schedule)?.extras[0]?.id ?? '';

    expect(findExtrasStage(withoutExtra(schedule, id))).toBeNull();
  });

  it('nieznany identyfikator niczego nie psuje', () => {
    const schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    expect(findExtrasStage(withoutExtra(schedule, 'nie-ma-takiego'))?.baseDays).toBe(3);
  });
});

describe('withExtraDays', () => {
  it('zmiana dni skladnika przelicza sume etapu', () => {
    const schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    const id = findExtrasStage(schedule)?.extras[0]?.id ?? '';

    expect(findExtrasStage(withExtraDays(schedule, id, 7))?.baseDays).toBe(7);
  });

  it('liczba ujemna schodzi do zera zamiast skracac termin', () => {
    const schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    const id = findExtrasStage(schedule)?.extras[0]?.id ?? '';

    expect(findExtrasStage(withExtraDays(schedule, id, -5))?.baseDays).toBe(0);
  });
});

describe('extrasDays', () => {
  it('pusta lista to zero dni', () => {
    expect(extrasDays([])).toBe(0);
  });
});

describe('usługi dodatkowe w wyniku harmonogramu', () => {
  it('wydluzaja optymalne zakonczenie o dni robocze', () => {
    // 2026-06-01 to poniedzialek; +3 dni robocze wykonawcy = czwartek 4 czerwca.
    const bazowy = newScheduleBody({ startDate: '2026-06-01', stages: [], holidays: 'none' });
    const zUsluga = withExtra(bazowy, { name: 'Panorama 360', days: 3 }, NAZWA);

    const wynik = calcSchedule(zUsluga, []);
    expect(wynik.providerDays).toBe(3);
    expect(wynik.endOptimal).toBe('2026-06-04');
  });

  it('wylaczony etap zbiorczy nie liczy sie do terminu', () => {
    const schedule = withExtra(pusty(), { name: 'Panorama', days: 3 }, NAZWA);
    const wylaczony = {
      ...schedule,
      stages: schedule.stages.map((stage) => ({ ...stage, enabled: false })),
    };

    expect(calcSchedule(wylaczony, []).providerDays).toBe(0);
  });
});
