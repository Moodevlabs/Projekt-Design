import { describe, expect, it } from 'vitest';
import {
  formatQty,
  minRuleCents,
  priceSuffix,
  pricingChoiceFor,
  pricingRuleForChoice,
  rateLine,
  unitForChoice,
  unitLabel,
} from './units';
import type { PricingRule } from '../quote/schema';
import { calcItemCents, countIndividualItems, newItem, newQuoteBody, newSection } from '../quote';
import { formatMoney } from '../money';
import { AMOUNT_BASIS } from '../quote/calc';

describe('unitLabel / formatQty', () => {
  it('ryczalt NIE ma etykiety — „1 ryczalt × 2000 zl" brzmi jak blad', () => {
    expect(unitLabel('lump')).toBe('');
    expect(formatQty(1, 'lump')).toBe('1');
  });

  it('metry i godziny maja skroty', () => {
    expect(formatQty(80, 'm2')).toBe('80 m²');
    expect(formatQty(4, 'hour')).toBe('4 h');
  });

  it('ulamek idzie z przecinkiem, jak w polskim zapisie', () => {
    expect(formatQty(2.5, 'hour')).toBe('2,5 h');
  });

  it('wlasna jednostka bierze nazwe od uzytkownika', () => {
    expect(formatQty(3, 'custom', 'kondygnacja')).toBe('3 kondygnacja');
  });

  it('`custom` bez nazwy zachowuje sie jak brak jednostki', () => {
    expect(formatQty(3, 'custom')).toBe('3');
  });

  it('sufiks ceny to „/ jednostka"', () => {
    expect(priceSuffix('m2')).toBe(' / m²');
    expect(priceSuffix('lump')).toBe('');
  });
});

describe('pricingChoiceFor', () => {
  it('„indywidualnie" poznajemy po BRAKU CENY, nie po trybie', () => {
    // Bez tego karta uslugi pokazywalaby „Kwota stala" przy pozycji, ktora
    // zadnej kwoty nie ma.
    expect(pricingChoiceFor('flat', 'lump', null)).toBe('individual');
  });

  it('kwota stala i za m² to ten sam tryb, inna jednostka', () => {
    expect(pricingChoiceFor('flat', 'lump', 1000)).toBe('flat_lump');
    expect(pricingChoiceFor('flat', 'm2', 1000)).toBe('flat_m2');
  });

  it('tryby parametryczne rozpoznaje po trybie', () => {
    expect(pricingChoiceFor('per_room', 'lump', 0)).toBe('per_room');
    expect(pricingChoiceFor('per_frame', 'frame', 0)).toBe('per_frame');
  });

  it('nieznana para spada do kwoty stalej, a nie wywala sie', () => {
    expect(pricingChoiceFor('flat', 'mb', 1000)).toBe('flat_lump');
  });

  it('wlasna jednostka z cena ma SWOJ kafelek, nie „Kwote stala"', () => {
    // Spadanie do `flat_lump` konczylo sie zapisem `unit: 'lump'` — „/ rysunek"
    // znikal z listy, z wyceny i z PDF po pierwszej edycji uslugi.
    expect(pricingChoiceFor('flat', 'custom', 12_000)).toBe('flat_custom');
  });
});

describe('unitForChoice', () => {
  it('„Wlasna jednostka" zapisuje `custom` z przycieta nazwa', () => {
    expect(unitForChoice('flat_custom', '  rysunek ')).toEqual({
      unit: 'custom',
      unitLabel: 'rysunek',
    });
  });

  it('kazdy inny kafelek ZERUJE nazwe — przy `m2` to martwy zapis', () => {
    expect(unitForChoice('flat_m2', 'rysunek')).toEqual({ unit: 'm2', unitLabel: null });
    expect(unitForChoice('per_room', 'rysunek')).toEqual({ unit: 'lump', unitLabel: null });
  });

  it('„Indywidualnie" zachowuje wlasna jednostke, jesli ja dostanie', () => {
    // Biblioteka przykladowa: „Aktualizacja dokumentacji" — bez ceny, za rysunek.
    expect(unitForChoice('individual', 'rysunek')).toEqual({
      unit: 'custom',
      unitLabel: 'rysunek',
    });
    expect(unitForChoice('individual', null)).toEqual({ unit: 'lump', unitLabel: null });
  });
});

describe('pricingRuleForChoice', () => {
  const perRoom: PricingRule = {
    mode: 'per_room',
    baseCents: 500,
    perRoomCents: { kuchnia: 30_000 },
    defaultPerRoomCents: 10_000,
    roomScope: 'all',
  };

  it('ten sam tryb oddaje regule NIETKNIETA — stawki edytuje macierz', () => {
    expect(pricingRuleForChoice('per_room', perRoom)).toBe(perRoom);
    expect(pricingRuleForChoice('flat_custom', { mode: 'flat' })).toEqual({ mode: 'flat' });
  });

  it('z kwoty stalej na pomieszczenia daje pusta regule parametryczna', () => {
    expect(pricingRuleForChoice('per_room', { mode: 'flat' })).toEqual({
      mode: 'per_room',
      baseCents: 0,
      perRoomCents: {},
      defaultPerRoomCents: 0,
      roomScope: 'all',
    });
  });

  it('miedzy trybami parametrycznymi przenosi stawki', () => {
    expect(pricingRuleForChoice('per_frame', perRoom)).toEqual({
      mode: 'per_frame',
      baseCents: 500,
      perRoomCents: { kuchnia: 30_000 },
      defaultPerRoomCents: 10_000,
    });
  });

  it('powrot do kwoty stalej porzuca stawki', () => {
    expect(pricingRuleForChoice('flat_hour', perRoom)).toEqual({ mode: 'flat' });
  });
});

describe('minRuleCents', () => {
  it('kwota stala nie ma „od" — cena jest jedna', () => {
    expect(minRuleCents({ mode: 'flat' })).toBeNull();
  });

  it('bierze najnizsza stawke pomieszczenia', () => {
    expect(
      minRuleCents({
        mode: 'per_room',
        baseCents: 0,
        perRoomCents: { kuchnia: 50_000, salon: 30_000 },
        defaultPerRoomCents: 40_000,
        roomScope: 'all',
      }),
    ).toBe(30_000);
  });

  it('doklada baze — usluga nigdy nie kosztuje mniej niz baza + najtansze pomieszczenie', () => {
    expect(
      minRuleCents({
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: { kuchnia: 30_000 },
        defaultPerRoomCents: 0,
        roomScope: 'all',
      }),
    ).toBe(50_000);
  });

  it('regula bez stawek i bez bazy nie ma „od"', () => {
    expect(
      minRuleCents({
        mode: 'per_room',
        baseCents: 0,
        perRoomCents: {},
        defaultPerRoomCents: 0,
        roomScope: 'all',
      }),
    ).toBeNull();
  });
});

describe('cena „indywidualna" w obliczeniach', () => {
  it('pozycja bez ceny NIE wnosi nic do sumy', () => {
    const item = newItem({ name: 'Projekt wnetrza', unitPriceCents: null, qty: 3 });
    expect(calcItemCents(item, [], AMOUNT_BASIS)).toBe(0);
  });

  it('zero to NIE to samo co brak ceny — oba licza sie jako 0, ale znacza co innego', () => {
    const gratis = newItem({ unitPriceCents: 0, qty: 1 });
    const indywidualna = newItem({ unitPriceCents: null, qty: 1 });

    expect(calcItemCents(gratis, [], AMOUNT_BASIS)).toBe(0);
    expect(calcItemCents(indywidualna, [], AMOUNT_BASIS)).toBe(0);
    // Roznice widac w liczniku, ktory zasila dopisek w podsumowaniu.
    const body = newQuoteBody({
      sections: [newSection({ items: [gratis, indywidualna] })],
    });
    expect(countIndividualItems(body)).toBe(1);
  });

  it('WYLACZONA pozycja indywidualna nie liczy sie do dopisku', () => {
    // Nie jest czescia oferty, wiec nie ma o czym uprzedzac.
    const body = newQuoteBody({
      sections: [newSection({ items: [newItem({ unitPriceCents: null, enabled: false })] })],
    });
    expect(countIndividualItems(body)).toBe(0);
  });

  it('liczy pozycje takze w grupach, nie tylko luzne', () => {
    const body = newQuoteBody({
      sections: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Sekcja',
          items: [newItem({ unitPriceCents: null })],
          groups: [
            {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Kuchnia',
              roomId: null,
              categoryId: null,
              items: [newItem({ unitPriceCents: null })],
            },
          ],
        },
      ],
    });
    expect(countIndividualItems(body)).toBe(2);
  });
});

describe('rateLine — stawka zamiast „1 m² ×"', () => {
  it('ryczalt z iloscia 1 nie drukuje nic', () => {
    expect(rateLine(1, 'lump', null, 200_000)).toBe('');
  });

  it('jednostka przy ilosci 1 daje sama stawke z sufiksem', () => {
    expect(rateLine(1, 'm2', null, 200_000)).toBe(`${formatMoney(200_000)} / m²`);
    expect(rateLine(1, 'hour', null, 15_000)).toBe(`${formatMoney(15_000)} / h`);
  });

  it('ilosc inna niz 1 stoi przed stawka, bez znaku mnozenia', () => {
    expect(rateLine(80, 'm2', null, 1_200)).toBe(`80 m² · ${formatMoney(1_200)} / m²`);
    expect(rateLine(3, 'lump', null, 50_000)).toBe(`3 · ${formatMoney(50_000)}`);
  });

  it('bez stawki (tryb godzinowy) zostaje sama ilosc z jednostka', () => {
    expect(rateLine(80, 'm2', null, null)).toBe('80 m²');
    expect(rateLine(1, 'm2', null, null)).toBe('');
  });

  it('wlasna jednostka idzie do sufiksu', () => {
    expect(rateLine(2, 'custom', 'kondygnacja', 90_000)).toBe(
      `2 kondygnacja · ${formatMoney(90_000)} / kondygnacja`,
    );
  });
});
