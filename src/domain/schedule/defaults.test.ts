import { describe, expect, it } from 'vitest';
import { newScheduleBody, scheduleFromTemplate } from './defaults';

describe('scheduleFromTemplate', () => {
  it('zeruje date startu', () => {
    // Data startu nalezy do konkretnego projektu, nie do pakietu. Szablon
    // zapisany w marcu z marcowa data bylby pulapka, ktorej nikt nie zauwazy
    // przed wyslaniem oferty.
    const szablon = newScheduleBody({ startDate: '2026-03-01' });

    expect(scheduleFromTemplate(szablon)?.startDate).toBeNull();
  });

  it('zachowuje etapy i ustawienia tygodnia pracy', () => {
    const szablon = newScheduleBody({
      startDate: '2026-03-01',
      providerWorkdaysPerWeek: 6,
      holidays: 'none',
    });

    const nowy = scheduleFromTemplate(szablon);
    expect(nowy?.stages.length).toBe(szablon.stages.length);
    expect(nowy?.providerWorkdaysPerWeek).toBe(6);
    expect(nowy?.holidays).toBe('none');
  });

  it('zwraca KOPIE, nie referencje do szablonu', () => {
    // Inaczej edycja terminu w nowej wycenie zmienialaby szablon w cache.
    const szablon = newScheduleBody();
    const nowy = scheduleFromTemplate(szablon);

    const etap = nowy?.stages[0];
    if (etap) etap.name = 'Zmienione';

    expect(szablon.stages[0]?.name).not.toBe('Zmienione');
  });

  it('brak harmonogramu zostaje brakiem', () => {
    expect(scheduleFromTemplate(null)).toBeNull();
  });
});
