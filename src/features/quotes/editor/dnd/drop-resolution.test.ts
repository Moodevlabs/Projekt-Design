import { describe, expect, it } from 'vitest';
import { locateGroup, locateItem, resolveDrop } from './drop-resolution';
import { newGroup, newItem, newQuoteBody, newSection, type QuoteBody } from '@/domain/quote';

/**
 * Dokument testowy:
 *   Sekcja A: luźne [a1, a2], grupa G1 [g1, g2], grupa G2 (pusta)
 *   Sekcja B: luźne [], brak grup
 */
function makeBody(): QuoteBody {
  return newQuoteBody({
    sections: [
      newSection({
        id: 'A',
        title: 'Sekcja A',
        items: [newItem({ id: 'a1', name: 'a1' }), newItem({ id: 'a2', name: 'a2' })],
        groups: [
          newGroup({
            id: 'G1',
            name: 'G1',
            items: [newItem({ id: 'g1', name: 'g1' }), newItem({ id: 'g2', name: 'g2' })],
          }),
          newGroup({ id: 'G2', name: 'G2', items: [] }),
        ],
      }),
      newSection({ id: 'B', title: 'Sekcja B', items: [], groups: [] }),
    ],
  });
}

const body = makeBody();

describe('locateItem / locateGroup', () => {
  it('znajduje pozycję luźną i w grupie', () => {
    expect(locateItem(body, 'a2')).toMatchObject({ sectionId: 'A', groupId: null, index: 1 });
    expect(locateItem(body, 'g1')).toMatchObject({ sectionId: 'A', groupId: 'G1', index: 0 });
  });

  it('zwraca null dla nieznanego id', () => {
    expect(locateItem(body, 'nie-ma')).toBeNull();
    expect(locateGroup(body, 'nie-ma')).toBeNull();
  });
});

describe('resolveDrop — pozycje', () => {
  it('przenosi pozycję na inną pozycję w tej samej liście', () => {
    const intent = resolveDrop(
      body,
      { kind: 'item', itemId: 'g2' },
      { kind: 'item', itemId: 'g1' },
    );
    expect(intent).toEqual({
      kind: 'item',
      args: { itemId: 'g2', toSectionId: 'A', toGroupId: 'G1', toIndex: 0 },
    });
  });

  it('przenosi pozycję z grupy do luźnych pozycji innej sekcji', () => {
    const intent = resolveDrop(
      body,
      { kind: 'item', itemId: 'g1' },
      { kind: 'section', sectionId: 'B' },
    );
    expect(intent).toEqual({
      kind: 'item',
      args: { itemId: 'g1', toSectionId: 'B', toGroupId: null, toIndex: 0 },
    });
  });

  it('upuszczenie na PUSTĄ grupę działa — bez tego nie dałoby się jej zapełnić', () => {
    const intent = resolveDrop(
      body,
      { kind: 'item', itemId: 'a1' },
      { kind: 'item-list', sectionId: 'A', groupId: 'G2' },
    );
    expect(intent).toEqual({
      kind: 'item',
      args: { itemId: 'a1', toSectionId: 'A', toGroupId: 'G2', toIndex: 0 },
    });
  });

  it('upuszczenie na nagłówek grupy wrzuca pozycję na jej koniec', () => {
    const intent = resolveDrop(
      body,
      { kind: 'item', itemId: 'a1' },
      { kind: 'group', groupId: 'G1' },
    );
    expect(intent).toEqual({
      kind: 'item',
      args: { itemId: 'a1', toSectionId: 'A', toGroupId: 'G1', toIndex: 2 },
    });
  });

  it('upuszczenie na samą siebie nic nie robi', () => {
    expect(
      resolveDrop(body, { kind: 'item', itemId: 'a1' }, { kind: 'item', itemId: 'a1' }),
    ).toBeNull();
  });

  it('upuszczenie na własne miejsce nic nie robi — inaczej samo kliknięcie brudziłoby dokument', () => {
    // `a2` już stoi na końcu swojej listy, więc „wrzuć na koniec" to zero zmian.
    expect(
      resolveDrop(
        body,
        { kind: 'item', itemId: 'a2' },
        { kind: 'item-list', sectionId: 'A', groupId: null },
      ),
    ).toBeNull();

    // …a upuszczenie na sąsiada tuż pod sobą też nie przestawia niczego.
    expect(
      resolveDrop(body, { kind: 'item', itemId: 'a1' }, { kind: 'item', itemId: 'a2' }),
    ).toBeNull();
  });

  it('pozycja z początku listy upuszczona na jej kontener ląduje na końcu', () => {
    const intent = resolveDrop(
      body,
      { kind: 'item', itemId: 'a1' },
      { kind: 'item-list', sectionId: 'A', groupId: null },
    );
    expect(intent).toEqual({
      kind: 'item',
      args: { itemId: 'a1', toSectionId: 'A', toGroupId: null, toIndex: 2 },
    });
  });
});

describe('resolveDrop — grupy', () => {
  it('zmienia kolejność grup w sekcji', () => {
    const intent = resolveDrop(
      body,
      { kind: 'group', groupId: 'G2' },
      { kind: 'group', groupId: 'G1' },
    );
    expect(intent).toEqual({
      kind: 'group',
      args: { groupId: 'G2', toSectionId: 'A', toIndex: 0 },
    });
  });

  it('przenosi grupę do pustej sekcji', () => {
    const intent = resolveDrop(
      body,
      { kind: 'group', groupId: 'G1' },
      { kind: 'section-groups', sectionId: 'B' },
    );
    expect(intent).toEqual({
      kind: 'group',
      args: { groupId: 'G1', toSectionId: 'B', toIndex: 0 },
    });
  });

  it('upuszczenie grupy na siebie nic nie robi', () => {
    expect(
      resolveDrop(body, { kind: 'group', groupId: 'G1' }, { kind: 'group', groupId: 'G1' }),
    ).toBeNull();
  });
});

describe('resolveDrop — sekcje', () => {
  it('zamienia sekcje miejscami', () => {
    const intent = resolveDrop(
      body,
      { kind: 'section', sectionId: 'B' },
      { kind: 'section', sectionId: 'A' },
    );
    expect(intent).toEqual({ kind: 'section', args: { sectionId: 'B', toIndex: 0 } });
  });

  it('sekcja upuszczona nad własną zawartością nie rusza się', () => {
    expect(
      resolveDrop(body, { kind: 'section', sectionId: 'A' }, { kind: 'item', itemId: 'a1' }),
    ).toBeNull();
  });

  it('sekcja upuszczona nad cudzą zawartością ląduje w tamtym miejscu', () => {
    const intent = resolveDrop(
      body,
      { kind: 'section', sectionId: 'A' },
      { kind: 'section-groups', sectionId: 'B' },
    );
    expect(intent).toEqual({ kind: 'section', args: { sectionId: 'A', toIndex: 1 } });
  });
});

describe('resolveDrop — nieznane id', () => {
  it('nie wywala się i nie proponuje ruchu', () => {
    expect(
      resolveDrop(body, { kind: 'item', itemId: 'x' }, { kind: 'item', itemId: 'a1' }),
    ).toBeNull();
    expect(
      resolveDrop(body, { kind: 'group', groupId: 'x' }, { kind: 'group', groupId: 'G1' }),
    ).toBeNull();
    expect(
      resolveDrop(body, { kind: 'section', sectionId: 'x' }, { kind: 'section', sectionId: 'A' }),
    ).toBeNull();
  });
});
