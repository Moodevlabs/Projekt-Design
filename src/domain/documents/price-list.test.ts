import { describe, expect, it } from 'vitest';
import {
  defaultPriceListItems,
  groupPriceListItems,
  newPriceListDoc,
  newPriceListItem,
  parseQuoteDocuments,
  PriceListDocSchema,
} from './index';

describe('szablon cennika usług dodatkowych', () => {
  it('ma trzy grupy z arkusza', () => {
    const grupy = groupPriceListItems(defaultPriceListItems()).map((group) => group.label);
    expect(grupy).toEqual(['Opracowania techniczne', 'Wizualizacje', 'Spotkania i komunikacja']);
  });

  it('każda pozycja ma cenę i termin albo jednostkę', () => {
    // Pozycja bez ceny jest w cenniku bezużyteczna.
    for (const item of defaultPriceListItems()) {
      expect(item.priceMinCents).toBeGreaterThan(0);
      expect(item.leadTime !== '' || item.unit !== '').toBe(true);
    }
  });

  it('każda pozycja ma świeży identyfikator', () => {
    const a = defaultPriceListItems();
    const b = defaultPriceListItems();
    expect(new Set([...a, ...b].map((item) => item.id)).size).toBe(a.length + b.length);
  });

  it('domyślna ważność to 14 dni', () => {
    expect(newPriceListDoc().validDays).toBe(14);
  });

  it('szablon workspace nadpisuje domyślny', () => {
    const doc = newPriceListDoc({}, [
      {
        name: 'Moja usługa',
        description: '',
        priceMinCents: 10_000,
        priceMaxCents: null,
        unit: '',
        leadTime: '',
        sectionLabel: '',
      },
    ]);
    expect(doc.items).toHaveLength(1);
    expect(doc.items[0]?.name).toBe('Moja usługa');
  });
});

describe('newPriceListItem', () => {
  it('bez górnej granicy znaczy jedną cenę, nie zero', () => {
    // `priceMaxCents: 0` byloby obietnica darmowej uslugi.
    expect(newPriceListItem({ priceMinCents: 30_000 }).priceMaxCents).toBeNull();
  });

  it('nie wpuszcza pól spoza schematu, gdy akcję podepnie się pod onClick', () => {
    const zdarzenie = { target: {}, currentTarget: {}, nativeEvent: {}, type: 'click' };
    const item = newPriceListItem(zdarzenie as never);

    expect(() => JSON.stringify(item)).not.toThrow();
    expect(Object.keys(item).sort()).toEqual(
      [
        'description',
        'id',
        'leadTime',
        'name',
        'priceMaxCents',
        'priceMinCents',
        'sectionLabel',
        'unit',
      ].sort(),
    );
  });

  it('odrzuca cenę ujemną, zamiast wpisać ją do dokumentu', () => {
    expect(newPriceListItem({ priceMinCents: -100 }).priceMinCents).toBe(0);
  });
});

describe('groupPriceListItems', () => {
  it('zachowuje kolejność pierwszego wystąpienia nagłówka', () => {
    const grupy = groupPriceListItems([
      newPriceListItem({ sectionLabel: 'B', name: 'b1' }),
      newPriceListItem({ sectionLabel: 'A', name: 'a1' }),
      newPriceListItem({ sectionLabel: 'B', name: 'b2' }),
    ]);

    expect(grupy.map((g) => g.label)).toEqual(['B', 'A']);
    expect(grupy[0]?.items.map((i) => i.name)).toEqual(['b1', 'b2']);
  });
});

describe('dokumenty wyceny — cennik obok etapów', () => {
  it('cennik i etapy żyją niezależnie w tym samym dokumencie', () => {
    const parsed = parseQuoteDocuments({
      stages: null,
      priceList: PriceListDocSchema.parse({ items: [], validDays: 30 }),
    });
    expect(parsed?.stages).toBeNull();
    expect(parsed?.priceList?.validDays).toBe(30);
  });

  it('dokument sprzed cennika czyta się dalej', () => {
    // Wyceny zapisane przy T-46 nie maja pola `priceList` — brak nie moze
    // zablokowac odczytu.
    const parsed = parseQuoteDocuments({ stages: null });
    expect(parsed).not.toBeNull();
    expect(parsed?.priceList).toBeNull();
  });

  it('zepsuty cennik nie blokuje wyceny', () => {
    expect(parseQuoteDocuments({ priceList: { validDays: 'dużo' } })).toBeNull();
  });
});
