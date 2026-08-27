import { describe, expect, it } from 'vitest';
import { AMOUNT_BASIS, calcGroupTotals, calcQuoteTotals, calcSectionTotals } from './calc';
import { newGroup, newItem, newQuoteBody, newSection } from './factory';
import type { Item, QuoteBody, Section } from './schema';

const item = (partial: Partial<Item> = {}): Item => newItem(partial);

const bodyOf = (sections: Section[], partial: Partial<QuoteBody> = {}): QuoteBody =>
  newQuoteBody({ sections, ...partial });

describe('calcQuoteTotals — podstawy', () => {
  it('pusty dokument daje same zera', () => {
    expect(calcQuoteTotals(newQuoteBody())).toEqual({
      itemsCents: 0,
      discountsCents: 0,
      netCents: 0,
      vatCents: 0,
      grossCents: 0,
    });
  });

  it('sumuje luźne pozycje sekcji i pozycje w grupach', () => {
    const body = bodyOf(
      [
        newSection({
          items: [item({ unitPriceCents: 10000 })],
          groups: [
            newGroup({ items: [item({ unitPriceCents: 5000 }), item({ unitPriceCents: 2500 })] }),
          ],
        }),
        newSection({ items: [item({ unitPriceCents: 2500 })] }),
      ],
      { vatRate: 0 },
    );

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(20000);
    expect(totals.netCents).toBe(20000);
    expect(totals.grossCents).toBe(20000);
  });

  it('pomija pozycje wyłączone', () => {
    const body = bodyOf(
      [
        newSection({
          items: [
            item({ unitPriceCents: 10000 }),
            item({ unitPriceCents: 99999, enabled: false }),
            item({ kind: 'discount', unitPriceCents: 5000, enabled: false }),
          ],
        }),
      ],
      { vatRate: 0 },
    );

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(10000);
    expect(totals.discountsCents).toBe(0);
    expect(totals.netCents).toBe(10000);
  });
});

describe('calcQuoteTotals — ilości', () => {
  it('mnoży cenę przez ilość większą od 1', () => {
    const body = bodyOf([newSection({ items: [item({ qty: 3, unitPriceCents: 1000 })] })], {
      vatRate: 0,
    });
    expect(calcQuoteTotals(body).itemsCents).toBe(3000);
  });

  it('obsługuje ilości ułamkowe i zaokrągla wartość pozycji do grosza', () => {
    const body = bodyOf([newSection({ items: [item({ qty: 2.5, unitPriceCents: 1999 })] })], {
      vatRate: 0,
    });
    // 2,5 × 19,99 zł = 49,975 zł → 49,98 zł
    expect(calcQuoteTotals(body).itemsCents).toBe(4998);
  });

  it('zaokrągla każdą pozycję osobno', () => {
    const body = bodyOf(
      [
        newSection({
          items: [item({ qty: 0.5, unitPriceCents: 101 }), item({ qty: 0.5, unitPriceCents: 101 })],
        }),
      ],
      { vatRate: 0 },
    );
    // 50,5 gr → 51 gr, dwa razy
    expect(calcQuoteTotals(body).itemsCents).toBe(102);
  });
});

describe('calcQuoteTotals — rabaty', () => {
  it('odejmuje rabat od sumy pozycji', () => {
    const body = bodyOf(
      [
        newSection({
          items: [
            item({ unitPriceCents: 15000 }),
            item({ kind: 'discount', unitPriceCents: 2000 }),
          ],
        }),
      ],
      { vatRate: 0 },
    );

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(15000);
    expect(totals.discountsCents).toBe(2000);
    expect(totals.netCents).toBe(13000);
  });

  it('rabat większy niż suma nie daje wartości ujemnej', () => {
    const body = bodyOf(
      [
        newSection({
          items: [item({ unitPriceCents: 1000 }), item({ kind: 'discount', unitPriceCents: 5000 })],
        }),
      ],
      { vatRate: 23 },
    );

    const totals = calcQuoteTotals(body);
    expect(totals.itemsCents).toBe(1000);
    expect(totals.discountsCents).toBe(5000);
    expect(totals.netCents).toBe(0);
    expect(totals.vatCents).toBe(0);
    expect(totals.grossCents).toBe(0);
  });

  it('rabat z ilością mnoży się jak zwykła pozycja', () => {
    const body = bodyOf(
      [
        newSection({
          items: [
            item({ unitPriceCents: 10000 }),
            item({ kind: 'discount', qty: 2, unitPriceCents: 1500 }),
          ],
        }),
      ],
      { vatRate: 0 },
    );
    expect(calcQuoteTotals(body).discountsCents).toBe(3000);
    expect(calcQuoteTotals(body).netCents).toBe(7000);
  });
});

describe('calcQuoteTotals — VAT', () => {
  it('pricesInclude "net": VAT doliczany do sumy', () => {
    const body = bodyOf([newSection({ items: [item({ unitPriceCents: 10000 })] })], {
      vatRate: 23,
      pricesInclude: 'net',
    });

    expect(calcQuoteTotals(body)).toMatchObject({
      netCents: 10000,
      vatCents: 2300,
      grossCents: 12300,
    });
  });

  it('pricesInclude "net": zaokrągla VAT do pełnych groszy', () => {
    const body = bodyOf([newSection({ items: [item({ unitPriceCents: 3333 })] })], {
      vatRate: 23,
      pricesInclude: 'net',
    });
    // 33,33 zł × 23% = 7,6659 zł → 7,67 zł
    expect(calcQuoteTotals(body)).toMatchObject({
      netCents: 3333,
      vatCents: 767,
      grossCents: 4100,
    });
  });

  it('pricesInclude "gross": ceny są brutto, netto liczone w dół', () => {
    const body = bodyOf([newSection({ items: [item({ unitPriceCents: 12300 })] })], {
      vatRate: 23,
      pricesInclude: 'gross',
    });

    expect(calcQuoteTotals(body)).toMatchObject({
      netCents: 10000,
      vatCents: 2300,
      grossCents: 12300,
    });
  });

  it('pricesInclude "gross": netto + VAT zawsze równa się brutto', () => {
    const body = bodyOf([newSection({ items: [item({ unitPriceCents: 10000 })] })], {
      vatRate: 23,
      pricesInclude: 'gross',
    });

    const totals = calcQuoteTotals(body);
    expect(totals.grossCents).toBe(10000);
    expect(totals.netCents).toBe(8130); // 100 zł / 1,23 = 81,3008 zł
    expect(totals.vatCents).toBe(1870);
    expect(totals.netCents + totals.vatCents).toBe(totals.grossCents);
  });

  it('stawka 0% nie zmienia kwot', () => {
    const sections = [newSection({ items: [item({ unitPriceCents: 5000 })] })];
    const zero = { netCents: 5000, vatCents: 0, grossCents: 5000 };

    expect(calcQuoteTotals(bodyOf(sections, { vatRate: 0, pricesInclude: 'net' }))).toMatchObject(
      zero,
    );
    expect(calcQuoteTotals(bodyOf(sections, { vatRate: 0, pricesInclude: 'gross' }))).toMatchObject(
      zero,
    );
  });
});

describe('calcSectionTotals / calcGroupTotals', () => {
  const group = newGroup({
    items: [item({ unitPriceCents: 4000 }), item({ kind: 'discount', unitPriceCents: 1000 })],
  });
  const section = newSection({ items: [item({ unitPriceCents: 2000 })], groups: [group] });

  it('grupa liczona domyślnie bez VAT', () => {
    expect(calcGroupTotals(group, AMOUNT_BASIS)).toEqual({
      itemsCents: 4000,
      discountsCents: 1000,
      netCents: 3000,
      vatCents: 0,
      grossCents: 3000,
    });
  });

  it('grupa z przekazanym kontekstem VAT', () => {
    expect(calcGroupTotals(group, AMOUNT_BASIS, { vatRate: 23 })).toMatchObject({
      netCents: 3000,
      vatCents: 690,
      grossCents: 3690,
    });
  });

  it('sekcja sumuje luźne pozycje i grupy', () => {
    expect(calcSectionTotals(section, AMOUNT_BASIS)).toMatchObject({
      itemsCents: 6000,
      discountsCents: 1000,
      netCents: 5000,
    });
  });

  it('sekcja z kontekstem brutto', () => {
    expect(
      calcSectionTotals(section, AMOUNT_BASIS, { vatRate: 23, pricesInclude: 'gross' }),
    ).toMatchObject({
      grossCents: 5000,
      netCents: 4065,
      vatCents: 935,
    });
  });
});
