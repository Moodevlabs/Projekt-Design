import { describe, expect, it } from 'vitest';

import { calcQuoteTotals } from '../quote/calc';
import { newGroup, newItem, newQuoteBody, newSection } from '../quote/factory';
import type { QuoteBody } from '../quote/schema';
import {
  applyCommentChanges,
  describeChange,
  type CommentChangeLibraryItem,
} from './apply-comment-changes';
import type { CommentChange } from './schema';

const WIZ = '11111111-1111-4111-8111-111111111111';
const PROJEKT = '22222222-2222-4222-8222-222222222222';
const NADZOR = '33333333-3333-4333-8333-333333333333';
const SEKCJA = '44444444-4444-4444-8444-444444444444';
const GRUPA = '55555555-5555-4555-8555-555555555555';
const LIB_OSWIETLENIE = '66666666-6666-4666-8666-666666666666';

function body(): QuoteBody {
  return newQuoteBody({
    sections: [
      newSection({
        id: SEKCJA,
        title: 'Projekt',
        items: [
          newItem({ id: PROJEKT, name: 'Projekt koncepcyjny', unitPriceCents: 500_00 }),
          newItem({
            id: NADZOR,
            name: 'Nadzór autorski',
            unitPriceCents: 100_00,
            enabled: false,
          }),
        ],
        groups: [
          newGroup({
            id: GRUPA,
            name: 'Łazienka',
            items: [newItem({ id: WIZ, name: 'Wizualizacje łazienki', unitPriceCents: 300_00 })],
          }),
        ],
      }),
    ],
  });
}

const library: CommentChangeLibraryItem[] = [
  {
    id: LIB_OSWIETLENIE,
    kind: 'item',
    name: 'Projekt oświetlenia',
    description: '',
    unitPriceCents: 250_00,
    pricing: { mode: 'flat' },
    unit: 'lump',
  },
];

describe('applyCommentChanges', () => {
  it('wyłącza pozycję w grupie i suma maleje', () => {
    const before = body();
    const change: CommentChange = { kind: 'disable', itemId: WIZ, reason: 'bez 3D' };

    const result = applyCommentChanges(before, [change], library);

    expect(result.applied).toEqual([change]);
    expect(result.skipped).toEqual([]);
    expect(result.body.sections[0]!.groups[0]!.items[0]!.enabled).toBe(false);
    expect(calcQuoteTotals(result.body).netCents).toBe(calcQuoteTotals(before).netCents - 300_00);
  });

  it('włącza wyłączoną pozycję luźną', () => {
    const result = applyCommentChanges(
      body(),
      [{ kind: 'enable', itemId: NADZOR, reason: '' }],
      [],
    );

    expect(result.applied).toHaveLength(1);
    expect(result.body.sections[0]!.items[1]!.enabled).toBe(true);
  });

  it('usuwa tylko pozycję WYŁĄCZONĄ', () => {
    const result = applyCommentChanges(
      body(),
      [
        { kind: 'remove', itemId: NADZOR, reason: '' },
        { kind: 'remove', itemId: PROJEKT, reason: '' },
      ],
      [],
    );

    expect(result.applied).toHaveLength(1);
    expect(result.skipped).toEqual([
      { change: { kind: 'remove', itemId: PROJEKT, reason: '' }, reason: 'enabled_item' },
    ]);
    expect(result.body.sections[0]!.items.map((item) => item.id)).toEqual([PROJEKT]);
  });

  it('`disable` + `remove` tej samej pozycji w jednej propozycji przechodzi', () => {
    const result = applyCommentChanges(
      body(),
      [
        { kind: 'disable', itemId: WIZ, reason: '' },
        { kind: 'remove', itemId: WIZ, reason: '' },
      ],
      [],
    );

    expect(result.skipped).toEqual([]);
    expect(result.body.sections[0]!.groups[0]!.items).toEqual([]);
  });

  it('dodaje usługę z biblioteki do wskazanej sekcji z ceną z biblioteki', () => {
    const result = applyCommentChanges(
      body(),
      [{ kind: 'add', libraryItemId: LIB_OSWIETLENIE, sectionId: SEKCJA, reason: '' }],
      library,
    );

    const added = result.body.sections[0]!.items.at(-1)!;
    expect(result.applied).toHaveLength(1);
    expect(added.name).toBe('Projekt oświetlenia');
    expect(added.unitPriceCents).toBe(250_00);
    expect(added.libraryItemId).toBe(LIB_OSWIETLENIE);
    expect(added.enabled).toBe(true);
  });

  it('zmienia ilość', () => {
    const result = applyCommentChanges(
      body(),
      [{ kind: 'qty', itemId: WIZ, qty: 3, reason: '' }],
      [],
    );

    expect(result.body.sections[0]!.groups[0]!.items[0]!.qty).toBe(3);
  });

  it('odrzuca nieznane id pozycji, sekcji i biblioteki oraz złą ilość', () => {
    const changes: CommentChange[] = [
      { kind: 'disable', itemId: 'nie-ma', reason: '' },
      { kind: 'add', libraryItemId: LIB_OSWIETLENIE, sectionId: 'nie-ma', reason: '' },
      { kind: 'add', libraryItemId: 'nie-ma', sectionId: SEKCJA, reason: '' },
      { kind: 'qty', itemId: WIZ, qty: 0, reason: '' },
    ];

    const result = applyCommentChanges(body(), changes, library);

    expect(result.applied).toEqual([]);
    expect(result.skipped.map((row) => row.reason)).toEqual([
      'unknown_item',
      'unknown_section',
      'unknown_library',
      'bad_qty',
    ]);
    expect(result.body).toEqual(body());
  });

  it('nie mutuje wejścia', () => {
    const before = body();
    const snapshot = structuredClone(before);

    applyCommentChanges(
      before,
      [
        { kind: 'disable', itemId: WIZ, reason: '' },
        { kind: 'remove', itemId: NADZOR, reason: '' },
        { kind: 'add', libraryItemId: LIB_OSWIETLENIE, sectionId: SEKCJA, reason: '' },
        { kind: 'qty', itemId: PROJEKT, qty: 2, reason: '' },
      ],
      library,
    );

    expect(before).toEqual(snapshot);
  });
});

describe('describeChange', () => {
  it('oddaje nazwę pozycji i tytuł sekcji, także dla pozycji w grupie', () => {
    expect(describeChange({ kind: 'disable', itemId: WIZ, reason: '' }, body(), library)).toEqual({
      itemName: 'Wizualizacje łazienki',
      sectionTitle: 'Projekt',
    });
  });

  it('dla `add` bierze nazwę z biblioteki', () => {
    expect(
      describeChange(
        { kind: 'add', libraryItemId: LIB_OSWIETLENIE, sectionId: SEKCJA, reason: '' },
        body(),
        library,
      ),
    ).toEqual({ itemName: 'Projekt oświetlenia', sectionTitle: 'Projekt' });
  });

  it('nieznane id daje `null`, a nie pusty napis', () => {
    expect(describeChange({ kind: 'enable', itemId: 'nie-ma', reason: '' }, body(), [])).toEqual({
      itemName: null,
      sectionTitle: null,
    });
  });
});
