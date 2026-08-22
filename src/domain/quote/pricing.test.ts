import { describe, expect, it } from 'vitest';
import { calcItemCents, calcQuoteTotals } from './calc';
import { newItem, newQuoteBody, newSection } from './factory';
import { newId } from '../id';
import type { Item, Room } from './schema';

/**
 * Parytet z arkuszem klienta (`OFERTA - DOKUMENT`). Ceny w groszach.
 * Typy pomieszczen maja stale id, zeby macierz cen dalo sie czytac wprost.
 */
const KUCHNIA = newId();
const SALON = newId();
const LAZIENKA = newId();

function room(partial: Partial<Room> & { label: string }): Room {
  return {
    id: newId(),
    roomTypeId: null,
    qty: 1,
    includedInVisual: true,
    includedInTechnical: true,
    ...partial,
  };
}

/** 7 pomieszczen, jak w arkuszu przy „Projekcie budowlanym”. */
function siedemPomieszczen(): Room[] {
  return [
    room({ label: 'Wiatrolap' }),
    room({ label: 'Korytarz' }),
    room({ label: 'Kuchnia', roomTypeId: KUCHNIA }),
    room({ label: 'Salon', roomTypeId: SALON }),
    room({ label: 'Lazienka', roomTypeId: LAZIENKA }),
    room({ label: 'Sypialnia' }),
    room({ label: 'Gabinet' }),
  ];
}

describe('calcItemCents — tryb flat (bez zmian wobec modelu sprzed cennika)', () => {
  it('liczy qty × cena i nie oglada sie na pomieszczenia', () => {
    const pozycja = newItem({ name: 'Nadzor', qty: 3, unitPriceCents: 25_000 });
    expect(calcItemCents(pozycja, siedemPomieszczen())).toBe(75_000);
  });

  it('qty ulamkowe zaokragla sie raz, na wartosci pozycji', () => {
    const pozycja = newItem({ name: 'Konsultacja', qty: 2.5, unitPriceCents: 12_333 });
    expect(calcItemCents(pozycja)).toBe(30_833); // 30 832,5 → 30 833
  });
});

describe('calcItemCents — per_room (parytet z K95)', () => {
  /** „Projekt budowlany”: baza 200 zl + 15 zl za kazde pomieszczenie. */
  const projektBudowlany = (partial: Partial<Item> = {}): Item =>
    newItem({
      name: 'Projekt budowlany',
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: {},
        defaultPerRoomCents: 1_500,
        roomScope: 'technical',
      },
      ...partial,
    });

  it('baza + skladnik za kazde pomieszczenie', () => {
    // Arkusz K95: 200 + 15 × 7 = 305 zl.
    expect(calcItemCents(projektBudowlany(), siedemPomieszczen())).toBe(30_500);
  });

  it('pomieszczenie poza zasiegiem nie doklada sie do ceny', () => {
    // Arkusz, wiersz 49: salon ma M=NIE, A=TAK — do czesci technicznej wchodzi,
    // do wizualnej nie.
    const pomieszczenia = siedemPomieszczen();
    pomieszczenia[3] = { ...pomieszczenia[3]!, includedInVisual: false };

    const techniczna = projektBudowlany();
    expect(calcItemCents(techniczna, pomieszczenia)).toBe(30_500);

    const wizualna = projektBudowlany({
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: {},
        defaultPerRoomCents: 1_500,
        roomScope: 'visual',
      },
    });
    // O jedno pomieszczenie mniej: 305 − 15 = 290 zl.
    expect(calcItemCents(wizualna, pomieszczenia)).toBe(29_000);
  });

  it('ilosc pomieszczenia mnozy jego skladnik (kuchnia x2)', () => {
    const pomieszczenia = siedemPomieszczen();
    pomieszczenia[2] = { ...pomieszczenia[2]!, qty: 2 };

    // Kuchnia liczona dwa razy: 305 + 15 = 320 zl.
    expect(calcItemCents(projektBudowlany(), pomieszczenia)).toBe(32_000);
  });

  it('cennik per typ pomieszczenia bierze pierwszenstwo przed domyslna cena', () => {
    const pozycja = projektBudowlany({
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: { [KUCHNIA]: 5_000, [LAZIENKA]: 4_000 },
        defaultPerRoomCents: 1_500,
        roomScope: 'all',
      },
    });

    // 200 + kuchnia 50 + lazienka 40 + 5 × 15 = 365 zl.
    expect(calcItemCents(pozycja, siedemPomieszczen())).toBe(36_500);
  });

  it('pomieszczenie spoza slownika liczy sie po cenie domyslnej', () => {
    const pozycja = projektBudowlany({
      pricing: {
        mode: 'per_room',
        baseCents: 0,
        perRoomCents: { [KUCHNIA]: 5_000 },
        defaultPerRoomCents: 1_500,
        roomScope: 'all',
      },
    });

    const pomieszczenia = [room({ label: 'Pracownia', roomTypeId: null })];
    expect(calcItemCents(pozycja, pomieszczenia)).toBe(1_500);
  });

  it('bez pomieszczen zostaje sama baza', () => {
    expect(calcItemCents(projektBudowlany(), [])).toBe(20_000);
  });

  it('qty pozycji mnozy calosc', () => {
    expect(calcItemCents(projektBudowlany({ qty: 2 }), siedemPomieszczen())).toBe(61_000);
  });
});

describe('calcItemCents — per_frame (parytet z K26)', () => {
  /** „Wizualizacja 3D”: cena pomieszczenia 350 zl + 50 zl za kazdy kadr. */
  const wizualizacja = (partial: Partial<Item> = {}): Item =>
    newItem({
      name: 'Wizualizacje 3D',
      pricing: {
        mode: 'per_frame',
        baseCents: 5_000,
        perRoomCents: { [KUCHNIA]: 35_000 },
        defaultPerRoomCents: 30_000,
      },
      ...partial,
    });

  it('cena pomieszczenia + baza × liczba kadrow', () => {
    const kuchnia = room({ label: 'Kuchnia', roomTypeId: KUCHNIA });
    // Arkusz K26: 350 + 50 × 3 = 500 zl.
    expect(calcItemCents(wizualizacja({ roomId: kuchnia.id, frames: 3 }), [kuchnia])).toBe(50_000);
  });

  it('brak liczby kadrow znaczy jeden kadr', () => {
    const kuchnia = room({ label: 'Kuchnia', roomTypeId: KUCHNIA });
    expect(calcItemCents(wizualizacja({ roomId: kuchnia.id }), [kuchnia])).toBe(40_000);
  });

  it('ilosc pomieszczenia mnozy cala pozycje', () => {
    const kuchnia = room({ label: 'Kuchnia', roomTypeId: KUCHNIA, qty: 2 });
    expect(calcItemCents(wizualizacja({ roomId: kuchnia.id, frames: 3 }), [kuchnia])).toBe(100_000);
  });

  it('pozycja bez przypisanego pomieszczenia liczy sie raz, po cenie domyslnej', () => {
    // Cicha zerowa cena bylaby gorsza — wizualizacja „luzem” wypadlaby z wyceny.
    expect(calcItemCents(wizualizacja({ frames: 2 }), siedemPomieszczen())).toBe(40_000);
  });
});

describe('calcQuoteTotals z pomieszczeniami', () => {
  it('sumuje pozycje parametryczne razem ze zwyklymi', () => {
    const rooms = siedemPomieszczen();
    const body = newQuoteBody({
      rooms,
      vatRate: 0,
      sections: [
        newSection({
          title: 'Etap techniczny',
          items: [
            newItem({
              name: 'Projekt budowlany',
              pricing: {
                mode: 'per_room',
                baseCents: 20_000,
                perRoomCents: {},
                defaultPerRoomCents: 1_500,
                roomScope: 'technical',
              },
            }),
            newItem({ name: 'Nadzor', qty: 2, unitPriceCents: 10_000 }),
          ],
        }),
      ],
    });

    // 305 zl + 200 zl = 505 zl.
    expect(calcQuoteTotals(body).netCents).toBe(50_500);
  });

  it('wylaczona pozycja parametryczna nie wchodzi do sumy', () => {
    const rooms = siedemPomieszczen();
    const body = newQuoteBody({
      rooms,
      vatRate: 0,
      sections: [
        newSection({
          items: [
            newItem({
              name: 'Projekt budowlany',
              enabled: false,
              pricing: {
                mode: 'per_room',
                baseCents: 20_000,
                perRoomCents: {},
                defaultPerRoomCents: 1_500,
                roomScope: 'all',
              },
            }),
          ],
        }),
      ],
    });

    expect(calcQuoteTotals(body).netCents).toBe(0);
  });

  it('rabat parametryczny odejmuje sie tak samo jak kwotowy', () => {
    const rooms = [room({ label: 'Kuchnia', roomTypeId: KUCHNIA })];
    const body = newQuoteBody({
      rooms,
      vatRate: 0,
      sections: [
        newSection({
          items: [
            newItem({ name: 'Projekt', unitPriceCents: 100_000 }),
            newItem({
              name: 'Rabat za komplet',
              kind: 'discount',
              pricing: {
                mode: 'per_room',
                baseCents: 0,
                perRoomCents: { [KUCHNIA]: 10_000 },
                defaultPerRoomCents: 0,
                roomScope: 'all',
              },
            }),
          ],
        }),
      ],
    });

    const totals = calcQuoteTotals(body);
    expect(totals.discountsCents).toBe(10_000);
    expect(totals.netCents).toBe(90_000);
  });
});

describe('zgodnosc wstecz', () => {
  it('wycena bez pomieszczen liczy sie dokladnie jak przed zmiana', () => {
    const body = newQuoteBody({
      vatRate: 23,
      sections: [
        newSection({
          items: [
            newItem({ name: 'Projekt', qty: 2, unitPriceCents: 150_000 }),
            newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 50_000 }),
          ],
        }),
      ],
    });

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(300_000);
    expect(totals.discountsCents).toBe(50_000);
    expect(totals.netCents).toBe(250_000);
    expect(totals.vatCents).toBe(57_500);
  });
});
