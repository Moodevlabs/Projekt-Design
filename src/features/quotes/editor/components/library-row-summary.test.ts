import { describe, expect, it } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { libraryRowSummary } from './library-row-summary';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

function item(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'l1',
    workspaceId: 'ws',
    category: 'Inne',
    categoryId: null,
    kind: 'item',
    name: 'Usługa',
    description: '',
    unitPriceCents: 25_000,
    unit: 'lump',
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    sortOrder: 0,
    pricing: { mode: 'flat' },
    variantOf: null,
    pricingBasis: 'amount',
    ...partial,
  };
}

describe('libraryRowSummary', () => {
  it('kwota stala: cena z jednostka', () => {
    const summary = libraryRowSummary(item({ unit: 'm2', unitPriceCents: 1_200 }));

    expect(summary.mode).toBe(pl.library.pricingChoices.flat_m2);
    // Porownanie z `formatMoney`, nie z literalem: separator tysiecy i spacja
    // przed „zl" sa TWARDE (U+00A0) i w edytorze wygladaja jak zwykle.
    expect(summary.price).toBe(formatMoney(1_200) + ' / m²');
    expect(summary.dependsOnRooms).toBe(false);
  });

  it('ryczalt nie doszywa jednostki', () => {
    // „1 ryczalt x 2000 zl" brzmi jak blad, „2000 zl" jak cena.
    expect(libraryRowSummary(item({ unit: 'lump', unitPriceCents: 200_000 })).price).toBe(
      formatMoney(200_000),
    );
  });

  it('usluga za pomieszczenie pokazuje „od", a nie cene koncowa', () => {
    /*
     * To jest cala poprawka z T-70: „250,00 zl" przy usludze liczonej za
     * pomieszczenie wygladalo na cene koncowa, a jest stawka za JEDNO
     * pomieszczenie — wycena wychodzila kilka razy wyzsza, niz sadzil autor.
     */
    const summary = libraryRowSummary(
      item({
        pricing: {
          mode: 'per_room',
          baseCents: 0,
          perRoomCents: { kuchnia: 50_000, lazienka: 25_000 },
          defaultPerRoomCents: 0,
          roomScope: 'all',
        },
      }),
    );

    expect(summary.mode).toBe(pl.library.pricingChoices.per_room);
    expect(summary.price).toBe(pl.editor.priceFrom(formatMoney(25_000)));
    expect(summary.dependsOnRooms).toBe(true);
  });

  it('recznie wpisana cena „od" wygrywa z minimum ze stawek', () => {
    const summary = libraryRowSummary(
      item({
        minPriceCents: 35_000,
        pricing: {
          mode: 'per_room',
          baseCents: 0,
          perRoomCents: { kuchnia: 50_000 },
          defaultPerRoomCents: 0,
          roomScope: 'all',
        },
      }),
    );

    expect(summary.price).toBe(pl.editor.priceFrom(formatMoney(35_000)));
  });

  it('brak ceny przy trybie stalym to wycena indywidualna, nie zero', () => {
    const summary = libraryRowSummary(item({ unitPriceCents: null }));

    expect(summary.mode).toBe(pl.library.pricingChoices.individual);
    expect(summary.price).toBe(pl.editor.individualPrice);
  });

  it('usluga za pomieszczenie bez stawek nie zmysla kwoty', () => {
    const summary = libraryRowSummary(
      item({
        pricing: {
          mode: 'per_room',
          baseCents: 0,
          perRoomCents: {},
          defaultPerRoomCents: 0,
          roomScope: 'all',
        },
      }),
    );

    // Pusty string, a nie „od 0 zl" — zero bylby obietnica, ktorej nikt nie zlozyl.
    expect(summary.price).toBe('');
  });
});
