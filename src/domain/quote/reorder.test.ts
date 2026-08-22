import { describe, expect, it } from 'vitest';
import { newGroup, newItem, newQuoteBody, newSection } from './factory';
import { moveGroup, moveItem, moveSection, nudgeGroup, nudgeItem, nudgeSection } from './reorder';
import type { QuoteBody } from './schema';

/**
 * Struktura testowa:
 *   s1: luźne [i1, i2], grupy [g1: [i3, i4], g2: [i5]]
 *   s2: luźne [i6],     grupy [g3: []]
 */
function fixture() {
  const i1 = newItem({ name: 'i1' });
  const i2 = newItem({ name: 'i2' });
  const i3 = newItem({ name: 'i3' });
  const i4 = newItem({ name: 'i4' });
  const i5 = newItem({ name: 'i5' });
  const i6 = newItem({ name: 'i6' });
  const g1 = newGroup({ name: 'g1', items: [i3, i4] });
  const g2 = newGroup({ name: 'g2', items: [i5] });
  const g3 = newGroup({ name: 'g3', items: [] });
  const s1 = newSection({ title: 's1', items: [i1, i2], groups: [g1, g2] });
  const s2 = newSection({ title: 's2', items: [i6], groups: [g3] });
  return { body: newQuoteBody({ sections: [s1, s2] }), i1, i2, i3, i4, i5, i6, g1, g2, g3, s1, s2 };
}

const shape = (body: QuoteBody) =>
  body.sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => item.name),
    groups: section.groups.map((group) => ({
      name: group.name,
      items: group.items.map((item) => item.name),
    })),
  }));

const UNKNOWN = '99999999-9999-4999-8999-999999999999';

describe('moveItem', () => {
  it('przenosi pozycję w obrębie tej samej grupy', () => {
    const { body, i3, g1, s1 } = fixture();
    const next = moveItem(body, {
      itemId: i3.id,
      toSectionId: s1.id,
      toGroupId: g1.id,
      toIndex: 1,
    });
    expect(shape(next)[0]?.groups[0]?.items).toEqual(['i4', 'i3']);
  });

  it('przenosi pozycję między grupami w tej samej sekcji', () => {
    const { body, i3, g2, s1 } = fixture();
    const next = moveItem(body, {
      itemId: i3.id,
      toSectionId: s1.id,
      toGroupId: g2.id,
      toIndex: 0,
    });
    expect(shape(next)[0]?.groups[0]?.items).toEqual(['i4']);
    expect(shape(next)[0]?.groups[1]?.items).toEqual(['i3', 'i5']);
  });

  it('przenosi pozycję do grupy w innej sekcji', () => {
    const { body, i3, g3, s2 } = fixture();
    const next = moveItem(body, {
      itemId: i3.id,
      toSectionId: s2.id,
      toGroupId: g3.id,
      toIndex: 0,
    });
    expect(shape(next)[0]?.groups[0]?.items).toEqual(['i4']);
    expect(shape(next)[1]?.groups[0]?.items).toEqual(['i3']);
  });

  it('przenosi pozycję do luźnych pozycji innej sekcji (toGroupId === null)', () => {
    const { body, i3, s2 } = fixture();
    const next = moveItem(body, {
      itemId: i3.id,
      toSectionId: s2.id,
      toGroupId: null,
      toIndex: 0,
    });
    expect(shape(next)[1]?.items).toEqual(['i3', 'i6']);
  });

  it('przenosi luźną pozycję do grupy', () => {
    const { body, i1, g1, s1 } = fixture();
    const next = moveItem(body, {
      itemId: i1.id,
      toSectionId: s1.id,
      toGroupId: g1.id,
      toIndex: 2,
    });
    expect(shape(next)[0]?.items).toEqual(['i2']);
    expect(shape(next)[0]?.groups[0]?.items).toEqual(['i3', 'i4', 'i1']);
  });
});

describe('moveItem — przypadki brzegowe', () => {
  it('nieznane id pozycji, sekcji lub grupy nie zmienia dokumentu', () => {
    const { body, i3, g1, s1 } = fixture();
    expect(
      moveItem(body, { itemId: UNKNOWN, toSectionId: s1.id, toGroupId: g1.id, toIndex: 0 }),
    ).toBe(body);
    expect(
      moveItem(body, { itemId: i3.id, toSectionId: UNKNOWN, toGroupId: null, toIndex: 0 }),
    ).toBe(body);
    expect(
      moveItem(body, { itemId: i3.id, toSectionId: s1.id, toGroupId: UNKNOWN, toIndex: 0 }),
    ).toBe(body);
  });

  it('przycina indeks docelowy do zakresu listy', () => {
    const { body, i1, g1, s1 } = fixture();
    const toEnd = moveItem(body, {
      itemId: i1.id,
      toSectionId: s1.id,
      toGroupId: g1.id,
      toIndex: 999,
    });
    expect(shape(toEnd)[0]?.groups[0]?.items).toEqual(['i3', 'i4', 'i1']);

    const toStart = moveItem(body, {
      itemId: i1.id,
      toSectionId: s1.id,
      toGroupId: g1.id,
      toIndex: -5,
    });
    expect(shape(toStart)[0]?.groups[0]?.items).toEqual(['i1', 'i3', 'i4']);

    const nan = moveItem(body, {
      itemId: i1.id,
      toSectionId: s1.id,
      toGroupId: g1.id,
      toIndex: Number.NaN,
    });
    expect(shape(nan)[0]?.groups[0]?.items).toEqual(['i1', 'i3', 'i4']);
  });

  it('nie mutuje wejścia', () => {
    const { body, i3, s2 } = fixture();
    const snapshot = structuredClone(body);
    moveItem(body, { itemId: i3.id, toSectionId: s2.id, toGroupId: null, toIndex: 0 });
    expect(body).toEqual(snapshot);
  });
});

describe('moveGroup', () => {
  it('zmienia kolejność grup w sekcji', () => {
    const { body, g2, s1 } = fixture();
    const next = moveGroup(body, { groupId: g2.id, toSectionId: s1.id, toIndex: 0 });
    expect(shape(next)[0]?.groups.map((g) => g.name)).toEqual(['g2', 'g1']);
  });

  it('przenosi grupę między sekcjami razem z pozycjami', () => {
    const { body, g1, s2 } = fixture();
    const next = moveGroup(body, { groupId: g1.id, toSectionId: s2.id, toIndex: 0 });
    expect(shape(next)[0]?.groups.map((g) => g.name)).toEqual(['g2']);
    expect(shape(next)[1]?.groups).toEqual([
      { name: 'g1', items: ['i3', 'i4'] },
      { name: 'g3', items: [] },
    ]);
  });

  it('nieznane id nie zmienia dokumentu', () => {
    const { body, g1, s1 } = fixture();
    expect(moveGroup(body, { groupId: UNKNOWN, toSectionId: s1.id, toIndex: 0 })).toBe(body);
    expect(moveGroup(body, { groupId: g1.id, toSectionId: UNKNOWN, toIndex: 0 })).toBe(body);
  });

  it('nie mutuje wejścia', () => {
    const { body, g1, s2 } = fixture();
    const snapshot = structuredClone(body);
    moveGroup(body, { groupId: g1.id, toSectionId: s2.id, toIndex: 0 });
    expect(body).toEqual(snapshot);
  });
});

describe('moveSection', () => {
  it('zmienia kolejność sekcji', () => {
    const { body, s2 } = fixture();
    const next = moveSection(body, { sectionId: s2.id, toIndex: 0 });
    expect(shape(next).map((s) => s.title)).toEqual(['s2', 's1']);
  });

  it('nieznane id nie zmienia dokumentu', () => {
    const { body } = fixture();
    expect(moveSection(body, { sectionId: UNKNOWN, toIndex: 0 })).toBe(body);
  });

  it('nie mutuje wejścia', () => {
    const { body, s2 } = fixture();
    const snapshot = structuredClone(body);
    moveSection(body, { sectionId: s2.id, toIndex: 0 });
    expect(body).toEqual(snapshot);
  });
});

describe('nudgeItem', () => {
  it('przesuwa pozycję w górę i w dół w obrębie grupy', () => {
    const { body, i3, i4 } = fixture();
    expect(shape(nudgeItem(body, i4.id, 'up'))[0]?.groups[0]?.items).toEqual(['i4', 'i3']);
    expect(shape(nudgeItem(body, i3.id, 'down'))[0]?.groups[0]?.items).toEqual(['i4', 'i3']);
  });

  it('przesuwa luźną pozycję sekcji', () => {
    const { body, i1 } = fixture();
    expect(shape(nudgeItem(body, i1.id, 'down'))[0]?.items).toEqual(['i2', 'i1']);
  });

  it('na krańcach listy nic nie robi', () => {
    const { body, i3, i4 } = fixture();
    expect(nudgeItem(body, i3.id, 'up')).toBe(body);
    expect(nudgeItem(body, i4.id, 'down')).toBe(body);
  });

  it('nieznane id nic nie robi', () => {
    const { body } = fixture();
    expect(nudgeItem(body, UNKNOWN, 'up')).toBe(body);
  });

  it('nie mutuje wejścia', () => {
    const { body, i4 } = fixture();
    const snapshot = structuredClone(body);
    nudgeItem(body, i4.id, 'up');
    expect(body).toEqual(snapshot);
  });
});

describe('nudgeGroup', () => {
  it('przesuwa grupę w sekcji', () => {
    const { body, g2 } = fixture();
    expect(shape(nudgeGroup(body, g2.id, 'up'))[0]?.groups.map((g) => g.name)).toEqual([
      'g2',
      'g1',
    ]);
  });

  it('na krańcach listy nic nie robi', () => {
    const { body, g1, g2 } = fixture();
    expect(nudgeGroup(body, g1.id, 'up')).toBe(body);
    expect(nudgeGroup(body, g2.id, 'down')).toBe(body);
  });

  it('nieznane id nic nie robi', () => {
    const { body } = fixture();
    expect(nudgeGroup(body, UNKNOWN, 'down')).toBe(body);
  });
});

describe('nudgeSection', () => {
  it('przesuwa sekcję', () => {
    const { body, s2 } = fixture();
    expect(shape(nudgeSection(body, s2.id, 'up')).map((s) => s.title)).toEqual(['s2', 's1']);
  });

  it('na krańcach listy nic nie robi', () => {
    const { body, s1, s2 } = fixture();
    expect(nudgeSection(body, s1.id, 'up')).toBe(body);
    expect(nudgeSection(body, s2.id, 'down')).toBe(body);
  });

  it('nieznane id nic nie robi', () => {
    const { body } = fixture();
    expect(nudgeSection(body, UNKNOWN, 'up')).toBe(body);
  });

  it('nie mutuje wejścia', () => {
    const { body, s2 } = fixture();
    const snapshot = structuredClone(body);
    nudgeSection(body, s2.id, 'up');
    expect(body).toEqual(snapshot);
  });
});
