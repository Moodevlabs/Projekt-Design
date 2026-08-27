import { describe, expect, it } from 'vitest';

import { diffQuoteBodies, hasChanges } from './diff';
import { duplicateQuoteBody, newGroup, newItem, newQuoteBody, newSection } from './factory';
import { newId } from '../id';

function bodyZ(items: Parameters<typeof newItem>[0][]) {
  return newQuoteBody({
    vatRate: 0,
    sections: [newSection({ title: 'Etap', items: items.map((i) => newItem(i)) })],
  });
}

describe('diffQuoteBodies — dopasowanie mimo nowych identyfikatorow', () => {
  /**
   * To jest sedno T-22. „Nowa wersja" idzie przez duplicateQuoteBody, ktora
   * REGENERUJE id — diff po id pokazalby, ze usunieto wszystko i dodano
   * wszystko od nowa.
   */
  it('kopia dokumentu nie ma zadnych zmian, choc wszystkie id sa inne', () => {
    const v1 = bodyZ([
      { name: 'Rzuty', unitPriceCents: 100_00 },
      { name: 'Wizualizacje', unitPriceCents: 900_00 },
    ]);
    const v2 = duplicateQuoteBody(v1);

    // Zalozenie testu: identyfikatory naprawde sie zmienily.
    expect(v2.sections[0]!.items[0]!.id).not.toBe(v1.sections[0]!.items[0]!.id);

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
    expect(diff.unchangedCount).toBe(2);
    expect(hasChanges(diff)).toBe(false);
  });

  it('dopasowuje po libraryItemId nawet po zmianie nazwy I sekcji', () => {
    const lib = newId();
    const v1 = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          title: 'Etap funkcjonalny',
          items: [newItem({ name: 'Wizualizacje', unitPriceCents: 900_00, libraryItemId: lib })],
        }),
      ],
    });
    const v2 = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          title: 'Etap wizualny',
          items: [newItem({ name: 'Wizualizacje 3D', unitPriceCents: 950_00, libraryItemId: lib })],
        }),
      ],
    });

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toHaveLength(1);

    const pola = diff.changed[0]!.changes.map((c) => c.field);
    expect(pola).toContain('name');
    expect(pola).toContain('price');
    expect(pola).toContain('path');
    expect(diff.changed[0]!.previousName).toBe('Wizualizacje');
  });

  it('dopasowuje po nazwie pozycje przeniesiona do innej grupy', () => {
    const v1 = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          title: 'Etap',
          items: [newItem({ name: 'Nadzor', unitPriceCents: 500_00 })],
        }),
      ],
    });
    const v2 = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          title: 'Etap',
          groups: [
            newGroup({
              name: 'Dodatki',
              items: [newItem({ name: 'Nadzor', unitPriceCents: 500_00 })],
            }),
          ],
        }),
      ],
    });

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.changes).toEqual([
      { field: 'path', before: 'Etap', after: 'Etap › Dodatki' },
    ]);
  });

  /**
   * Zly domysl („to ta sama pozycja, tylko podrozala o 4000 zl") jest gorszy
   * niz uczciwe „usunieto jedna, dodano druga".
   */
  it('nie zgaduje przy dwoch pozycjach o tej samej nazwie', () => {
    const v1 = bodyZ([
      { name: 'Wizyta', unitPriceCents: 100_00 },
      { name: 'Wizyta', unitPriceCents: 200_00 },
    ]);
    const v2 = bodyZ([{ name: 'Wizyta', unitPriceCents: 300_00 }]);

    const diff = diffQuoteBodies(v1, v2);
    // Dwie po lewej, jedna po prawej -> zaden przebieg nie tworzy pary.
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toHaveLength(2);
    expect(diff.added).toHaveLength(1);
  });
});

describe('diffQuoteBodies — dodane, usuniete, wylaczone', () => {
  it('rozpoznaje dodanie i usuniecie pozycji', () => {
    const v1 = bodyZ([{ name: 'Rzuty', unitPriceCents: 100_00 }]);
    const v2 = bodyZ([{ name: 'Wizualizacje', unitPriceCents: 900_00 }]);

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.added.map((e) => e.name)).toEqual(['Wizualizacje']);
    expect(diff.removed.map((e) => e.name)).toEqual(['Rzuty']);
  });

  it('wylaczenie pozycji to zmiana, nie usuniecie', () => {
    const v1 = bodyZ([{ name: 'Nadzor', unitPriceCents: 500_00, enabled: true }]);
    const v2 = bodyZ([{ name: 'Nadzor', unitPriceCents: 500_00, enabled: false }]);

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.removed).toEqual([]);
    expect(diff.changed[0]!.changes).toEqual([{ field: 'enabled', before: true, after: false }]);
  });

  it('zmiana ilosci jest widoczna osobno od ceny jednostkowej', () => {
    const v1 = bodyZ([{ name: 'Wizyta', unitPriceCents: 100_00, qty: 1 }]);
    const v2 = bodyZ([{ name: 'Wizyta', unitPriceCents: 100_00, qty: 3 }]);

    const diff = diffQuoteBodies(v1, v2);
    const pola = diff.changed[0]!.changes.map((c) => c.field);
    expect(pola).toContain('qty');
    // Kwota pozycji tez rosnie, bo `calcItemCents` mnozy przez ilosc.
    expect(diff.changed[0]!.centsAfter).toBe(300_00);
  });
});

describe('diffQuoteBodies — kwoty', () => {
  it('dodatnia roznica znaczy, ze nowsza wersja jest drozsza', () => {
    const v1 = bodyZ([{ name: 'Rzuty', unitPriceCents: 100_00 }]);
    const v2 = bodyZ([{ name: 'Rzuty', unitPriceCents: 150_00 }]);

    const diff = diffQuoteBodies(v1, v2);
    expect(diff.netDeltaCents).toBe(50_00);
    expect(diff.totalsBefore.netCents).toBe(100_00);
    expect(diff.totalsAfter.netCents).toBe(150_00);
  });

  it('ujemna roznica przy potanieniu', () => {
    const v1 = bodyZ([{ name: 'Rzuty', unitPriceCents: 150_00 }]);
    const v2 = bodyZ([{ name: 'Rzuty', unitPriceCents: 100_00 }]);
    expect(diffQuoteBodies(v1, v2).netDeltaCents).toBe(-50_00);
  });

  it('wylaczona pozycja wypada z kwoty, choc zostaje w dokumencie', () => {
    const v1 = bodyZ([{ name: 'Nadzor', unitPriceCents: 500_00, enabled: true }]);
    const v2 = bodyZ([{ name: 'Nadzor', unitPriceCents: 500_00, enabled: false }]);
    expect(diffQuoteBodies(v1, v2).netDeltaCents).toBe(-500_00);
  });

  it('puste dokumenty nie wywalaja porownania', () => {
    const pusty = newQuoteBody({ vatRate: 0 });
    const diff = diffQuoteBodies(pusty, pusty);
    expect(hasChanges(diff)).toBe(false);
    expect(diff.netDeltaCents).toBe(0);
  });
});
