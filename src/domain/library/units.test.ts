import { describe, expect, it } from 'vitest';
import { formatQty, minRuleCents, priceSuffix, pricingChoiceFor, unitLabel } from './units';
import { calcItemCents, countIndividualItems, newItem, newQuoteBody, newSection } from '../quote';
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
