import { describe, expect, it } from 'vitest';
import { calcDiscounts, roundToStep } from './discounts';
import { calcQuoteTotals } from './calc';
import { newItem, newQuoteBody, newSection } from './factory';
import { newId } from '../id';
import type { Discount, Item, QuoteBody, Section } from './schema';

function discount(partial: Partial<Discount> & { name: string; type: Discount['type'] }): Discount {
  return {
    id: newId(),
    description: '',
    enabled: true,
    scope: 'quote',
    sectionId: null,
    itemIds: [],
    condition: 'always',
    roundToCents: 0,
    ...partial,
  };
}

/** Etap z pieciu pozycji po 100 zl — wygodna podstawa: 500 zl. */
function etap(items: Item[], title = 'Etap funkcjonalny'): Section {
  return newSection({ title, items });
}

function bodyOf(sections: Section[], discounts: Discount[] = []): QuoteBody {
  return newQuoteBody({ sections, discounts, vatRate: 0 });
}

function pozycje(ile: number, cena = 10_000): Item[] {
  return Array.from({ length: ile }, (_, index) =>
    newItem({ name: `Pozycja ${index + 1}`, unitPriceCents: cena }),
  );
}

describe('roundToStep — odpowiednik MROUND z arkusza', () => {
  it('zaokragla do wielokrotnosci', () => {
    expect(roundToStep(2_537, 1_000)).toBe(3_000);
    expect(roundToStep(2_400, 1_000)).toBe(2_000);
    expect(roundToStep(2_500, 1_000)).toBe(3_000);
  });

  it('krok zerowy albo ujemny znaczy „nie zaokraglaj”', () => {
    expect(roundToStep(2_537, 0)).toBe(2_537);
    expect(roundToStep(2_537, -5)).toBe(2_537);
  });
});

describe('calcDiscounts — rabat kwotowy', () => {
  it('odejmuje wpisana kwote', () => {
    const body = bodyOf(
      [etap(pozycje(2))],
      [discount({ name: 'Rabat', type: 'fixed', valueCents: 5_000 })],
    );

    expect(calcDiscounts(body).totalCents).toBe(5_000);
  });

  it('wylaczony rabat nie liczy sie wcale', () => {
    const body = bodyOf(
      [etap(pozycje(2))],
      [discount({ name: 'Rabat', type: 'fixed', valueCents: 5_000, enabled: false })],
    );

    expect(calcDiscounts(body).totalCents).toBe(0);
  });

  it('nie zjada wiecej, niz wynosza pozycje', () => {
    // Arkusz tego nie pilnuje — my tak. Ujemnej wyceny klientowi nie wystawiamy.
    const body = bodyOf(
      [etap(pozycje(1))],
      [discount({ name: 'Za duzy rabat', type: 'fixed', valueCents: 999_000 })],
    );

    expect(calcDiscounts(body).totalCents).toBe(10_000);
  });
});

describe('calcDiscounts — procent i zakres', () => {
  it('procent od calej wyceny', () => {
    const body = bodyOf(
      [etap(pozycje(5))],
      [discount({ name: 'Wizualizacje uproszczone', type: 'percent', percent: 25 })],
    );

    // 25% z 500 zl = 125 zl.
    expect(calcDiscounts(body).totalCents).toBe(12_500);
  });

  it('procent od jednej sekcji', () => {
    const funkcjonalny = etap(pozycje(5));
    const wizualny = etap(pozycje(3), 'Etap wizualny');
    const body = bodyOf(
      [funkcjonalny, wizualny],
      [
        discount({
          name: 'Rabat etapu wizualnego',
          type: 'percent',
          percent: 10,
          scope: 'section',
          sectionId: wizualny.id,
        }),
      ],
    );

    // 10% z 300 zl, nie z 800 zl.
    expect(calcDiscounts(body).totalCents).toBe(3_000);
  });

  it('procent od wskazanych pozycji', () => {
    const items = pozycje(5);
    const body = bodyOf(
      [etap(items)],
      [
        discount({
          name: 'Rabat na wizualizacje',
          type: 'percent',
          percent: 25,
          scope: 'items',
          itemIds: [items[0]!.id, items[1]!.id],
        }),
      ],
    );

    // 25% z 200 zl = 50 zl.
    expect(calcDiscounts(body).totalCents).toBe(5_000);
  });

  it('wylaczona pozycja nie powieksza podstawy procentu', () => {
    const items = pozycje(5);
    items[0] = { ...items[0]!, enabled: false };
    const body = bodyOf([etap(items)], [discount({ name: '10%', type: 'percent', percent: 10 })]);

    // 10% z 400 zl, nie z 500 zl.
    expect(calcDiscounts(body).totalCents).toBe(4_000);
  });

  it('rabaty kwotowe z pozycji nie wchodza do podstawy procentu', () => {
    // Inaczej procent naliczalby sie od cudzej obnizki.
    const items = [
      ...pozycje(5),
      newItem({ name: 'Stary rabat', kind: 'discount', unitPriceCents: 20_000 }),
    ];
    const body = bodyOf([etap(items)], [discount({ name: '10%', type: 'percent', percent: 10 })]);

    expect(calcDiscounts(body).lines[0]?.baseCents).toBe(50_000);
  });
});

describe('calcDiscounts — rabat warunkowy (parytet z K114)', () => {
  const rabatZaKomplet = (sectionId: string) =>
    discount({
      name: 'Rabat za kompletny etap',
      type: 'percent',
      percent: 5,
      scope: 'section',
      sectionId,
      condition: 'all_items_in_scope_enabled',
      roundToCents: 1_000, // MROUND(…; 10 zl)
    });

  it('nalicza sie, gdy wszystkie pozycje etapu sa wziete', () => {
    const funkcjonalny = etap(pozycje(5));
    const body = bodyOf([funkcjonalny], [rabatZaKomplet(funkcjonalny.id)]);

    const wynik = calcDiscounts(body);
    // 5% z 500 zl = 25 zl → MROUND do 10 zl = 30 zl.
    expect(wynik.totalCents).toBe(3_000);
    expect(wynik.lines[0]?.conditionMet).toBe(true);
    expect(wynik.lines[0]?.enabledInScope).toBe(5);
    expect(wynik.lines[0]?.itemsInScope).toBe(5);
  });

  it('przepada, gdy klient rezygnuje z choc jednej pozycji', () => {
    const items = pozycje(5);
    items[2] = { ...items[2]!, enabled: false };
    const funkcjonalny = etap(items);
    const body = bodyOf([funkcjonalny], [rabatZaKomplet(funkcjonalny.id)]);

    const wynik = calcDiscounts(body);
    expect(wynik.totalCents).toBe(0);
    expect(wynik.lines[0]?.conditionMet).toBe(false);
    // UI pokaze „4/5 pozycji” — bez tego zero wyglada jak blad.
    expect(wynik.lines[0]?.enabledInScope).toBe(4);
    expect(wynik.lines[0]?.itemsInScope).toBe(5);
  });

  it('pusty zakres nie spelnia warunku kompletnosci', () => {
    const pusty = etap([]);
    const body = bodyOf([pusty], [rabatZaKomplet(pusty.id)]);

    // „Wszystkie z zera” to nie jest kompletny etap — to brak etapu.
    expect(calcDiscounts(body).lines[0]?.conditionMet).toBe(false);
  });
});

describe('calcDiscounts — niekompletne dane rabatu', () => {
  it('rabat wskazujacy nieistniejaca sekcje ma pusty zakres i nic nie odejmuje', () => {
    const body = bodyOf(
      [etap(pozycje(5))],
      [
        discount({
          name: 'Sierota po skasowanej sekcji',
          type: 'percent',
          percent: 10,
          scope: 'section',
          sectionId: newId(),
        }),
      ],
    );

    const wynik = calcDiscounts(body);
    expect(wynik.totalCents).toBe(0);
    expect(wynik.lines[0]?.itemsInScope).toBe(0);
  });

  it('procent bez wartosci to zero, nie NaN', () => {
    const body = bodyOf([etap(pozycje(5))], [discount({ name: 'Bez procentu', type: 'percent' })]);
    expect(calcDiscounts(body).totalCents).toBe(0);
  });

  it('kwota bez wartosci to zero, nie NaN', () => {
    const body = bodyOf([etap(pozycje(5))], [discount({ name: 'Bez kwoty', type: 'fixed' })]);
    expect(calcDiscounts(body).totalCents).toBe(0);
  });
});

describe('calcDiscounts — kolejnosc', () => {
  it('rabat na calosc liczy sie od kwoty juz pomniejszonej', () => {
    const items = pozycje(5);
    const sekcja = etap(items);
    const body = bodyOf(
      [sekcja],
      [
        discount({ name: 'Na calosc 50%', type: 'percent', percent: 50 }),
        discount({
          name: 'Na sekcje 50%',
          type: 'percent',
          percent: 50,
          scope: 'section',
          sectionId: sekcja.id,
        }),
      ],
    );

    // Sekcja: 50% z 500 = 250. Calosc: 50% z pozostalych 250 = 125. Razem 375 zl,
    // a nie 500 zl — dwa rabaty po 50% nie moga wyzerowac wyceny.
    expect(calcDiscounts(body).totalCents).toBe(37_500);
  });

  it('suma rabatow nie przekracza sumy pozycji', () => {
    const body = bodyOf(
      [etap(pozycje(2))],
      [
        discount({ name: 'A', type: 'fixed', valueCents: 15_000 }),
        discount({ name: 'B', type: 'fixed', valueCents: 15_000 }),
      ],
    );

    expect(calcDiscounts(body).totalCents).toBe(20_000);
  });
});

describe('calcQuoteTotals z rabatami', () => {
  it('sumuje oba zrodla: pozycje `kind: discount` i liste rabatow', () => {
    // Przeniesienie starych rabatow do nowego mechanizmu to T-36; do tego czasu
    // musza liczyc sie rownolegle, inaczej istniejace wyceny podrozalyby.
    const items = [
      ...pozycje(5),
      newItem({ name: 'Stary rabat kwotowy', kind: 'discount', unitPriceCents: 10_000 }),
    ];
    const body = bodyOf([etap(items)], [discount({ name: '10%', type: 'percent', percent: 10 })]);

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(50_000);
    // 100 zl (stary) + 10% z 500 zl (nowy) = 150 zl.
    expect(totals.discountsCents).toBe(15_000);
    expect(totals.netCents).toBe(35_000);
  });

  it('wycena bez rabatow liczy sie jak przed zmiana', () => {
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

describe('calcDiscounts — pozycje parametryczne', () => {
  it('procent liczy sie od ceny policzonej wg reguly cenowej', () => {
    const roomTypeId = newId();
    const body = newQuoteBody({
      vatRate: 0,
      rooms: [
        {
          id: newId(),
          roomTypeId,
          label: 'Kuchnia',
          qty: 1,
          includedInVisual: true,
          includedInTechnical: true,
        },
      ],
      sections: [
        newSection({
          items: [
            newItem({
              name: 'Projekt budowlany',
              pricing: {
                mode: 'per_room',
                baseCents: 20_000,
                perRoomCents: { [roomTypeId]: 10_000 },
                defaultPerRoomCents: 0,
                roomScope: 'all',
              },
            }),
          ],
        }),
      ],
      discounts: [discount({ name: '10%', type: 'percent', percent: 10 })],
    });

    // Pozycja to 200 + 100 = 300 zl; 10% = 30 zl.
    expect(calcDiscounts(body).totalCents).toBe(3_000);
  });
});
