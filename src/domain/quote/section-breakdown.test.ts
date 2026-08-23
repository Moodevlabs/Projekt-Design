import { describe, expect, it } from 'vitest';
import { calcSectionBreakdown } from './calc';
import { newItem, newQuoteBody, newSection } from './factory';
import { newId } from '../id';
import type { Discount, Item, Section } from './schema';

function discount(partial: Partial<Discount> & { name: string }): Discount {
  return {
    id: newId(),
    description: '',
    enabled: true,
    type: 'fixed',
    valueCents: 0,
    scope: 'quote',
    sectionId: null,
    itemIds: [],
    condition: 'always',
    roundToCents: 0,
    ...partial,
  };
}

function sekcja(title: string, items: Item[]): Section {
  return newSection({ title, items });
}

describe('calcSectionBreakdown', () => {
  const funkcjonalny = sekcja('Etap funkcjonalny', [
    newItem({ name: 'Rzuty', unitPriceCents: 50_000 }),
    newItem({ name: 'Finalny rzut', unitPriceCents: 45_000 }),
  ]);
  const wizualny = sekcja('Etap wizualny', [
    newItem({ name: 'Wizualizacje', unitPriceCents: 920_000 }),
  ]);

  it('liczy sumy osobno dla kazdej sekcji', () => {
    const body = newQuoteBody({ vatRate: 0, sections: [funkcjonalny, wizualny] });
    const [a, b] = calcSectionBreakdown(body);

    expect(a?.title).toBe('Etap funkcjonalny');
    expect(a?.netCents).toBe(95_000);
    expect(b?.netCents).toBe(920_000);
  });

  it('rabat sekcyjny obniza WLASNA sekcje i tylko ja', () => {
    const body = newQuoteBody({
      vatRate: 0,
      sections: [funkcjonalny, wizualny],
      discounts: [
        discount({
          name: 'Rabat etapu wizualnego',
          type: 'percent',
          percent: 10,
          scope: 'section',
          sectionId: wizualny.id,
        }),
      ],
    });

    const [a, b] = calcSectionBreakdown(body);
    expect(a?.discountsCents).toBe(0);
    expect(a?.netCents).toBe(95_000);
    // Kryterium: suma sekcji = pozycje sekcji − rabaty sekcji.
    expect(b?.discountsCents).toBe(92_000);
    expect(b?.netCents).toBe(828_000);
  });

  it('rabat na cala wycene NIE jest rozsmarowywany po sekcjach', () => {
    // Rozdzielenie go proporcjonalnie daloby liczby, ktorych nie da sie
    // odtworzyc recznie — a to podsumowanie sluzy do sprawdzania.
    const body = newQuoteBody({
      vatRate: 0,
      sections: [funkcjonalny, wizualny],
      discounts: [discount({ name: 'Rabat ogolny', type: 'fixed', valueCents: 100_000 })],
    });

    const [a, b] = calcSectionBreakdown(body);
    expect(a?.discountsCents).toBe(0);
    expect(b?.discountsCents).toBe(0);
  });

  it('rabat na wybrane pozycje wchodzi do sekcji tylko, gdy WSZYSTKIE tam leza', () => {
    const body = newQuoteBody({
      vatRate: 0,
      sections: [funkcjonalny, wizualny],
      discounts: [
        discount({
          name: 'Rabat na rzuty',
          type: 'fixed',
          valueCents: 5_000,
          scope: 'items',
          itemIds: funkcjonalny.items.map((item) => item.id),
        }),
      ],
    });

    const [a, b] = calcSectionBreakdown(body);
    expect(a?.discountsCents).toBe(5_000);
    expect(b?.discountsCents).toBe(0);
  });

  it('rabat rozlozony na dwie sekcje nie trafia do zadnej', () => {
    const body = newQuoteBody({
      vatRate: 0,
      sections: [funkcjonalny, wizualny],
      discounts: [
        discount({
          name: 'Rabat mieszany',
          type: 'fixed',
          valueCents: 5_000,
          scope: 'items',
          itemIds: [funkcjonalny.items[0]!.id, wizualny.items[0]!.id],
        }),
      ],
    });

    const [a, b] = calcSectionBreakdown(body);
    expect(a?.discountsCents).toBe(0);
    expect(b?.discountsCents).toBe(0);
  });

  it('rabat warunkowy, ktory sie nie nalezy, nie obniza sekcji', () => {
    const zWylaczona = sekcja('Etap funkcjonalny', [
      newItem({ name: 'Rzuty', unitPriceCents: 50_000 }),
      newItem({ name: 'Finalny rzut', unitPriceCents: 45_000, enabled: false }),
    ]);

    const body = newQuoteBody({
      vatRate: 0,
      sections: [zWylaczona],
      discounts: [
        discount({
          name: 'Rabat za komplet',
          type: 'percent',
          percent: 5,
          scope: 'section',
          sectionId: zWylaczona.id,
          condition: 'all_items_in_scope_enabled',
        }),
      ],
    });

    const [a] = calcSectionBreakdown(body);
    expect(a?.discountsCents).toBe(0);
    // Wylaczona pozycja nie liczy sie tez do sumy sekcji.
    expect(a?.netCents).toBe(50_000);
  });

  it('uwzglednia pozycje liczone za pomieszczenie', () => {
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
        sekcja('Etap techniczny', [
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
        ]),
      ],
    });

    expect(calcSectionBreakdown(body)[0]?.netCents).toBe(30_000);
  });
});
