import { describe, expect, it } from 'vitest';
import {
  LibraryGroupSchema,
  LibraryItemSchema,
  LibraryItemSnapshotSchema,
  libraryItemToQuoteItem,
  librarySnapshotToQuoteItem,
} from './schema';

const WS = '11111111-1111-4111-8111-111111111111';
const LI = '22222222-2222-4222-8222-222222222222';

describe('LibraryItemSchema', () => {
  it('uzupełnia wartości domyślne zgodne z migracją', () => {
    expect(LibraryItemSchema.parse({ id: LI, workspaceId: WS, name: 'Projekt koncepcyjny' })).toEqual(
      {
        id: LI,
        workspaceId: WS,
        category: 'Inne',
        kind: 'item',
        name: 'Projekt koncepcyjny',
        description: '',
        unitPriceCents: 0,
        sortOrder: 0,
      },
    );
  });

  it('odrzuca cenę ułamkową i pustą nazwę', () => {
    expect(
      LibraryItemSchema.safeParse({ id: LI, workspaceId: WS, name: 'X', unitPriceCents: 1.5 })
        .success,
    ).toBe(false);
    expect(LibraryItemSchema.safeParse({ id: LI, workspaceId: WS, name: '' }).success).toBe(false);
  });
});

describe('LibraryGroupSchema', () => {
  it('domyślnie ma pustą listę pozycji', () => {
    expect(LibraryGroupSchema.parse({ id: LI, workspaceId: WS, name: 'Kuchnia' })).toMatchObject({
      name: 'Kuchnia',
      items: [],
      sortOrder: 0,
    });
  });

  it('waliduje snapshoty pozycji', () => {
    const group = LibraryGroupSchema.parse({
      id: LI,
      workspaceId: WS,
      name: 'Kuchnia',
      items: [{ name: 'Rzut', unitPriceCents: 12000 }],
    });
    expect(group.items[0]).toEqual({
      name: 'Rzut',
      description: '',
      kind: 'item',
      unitPriceCents: 12000,
      libraryItemId: null,
    });
  });
});

describe('libraryItemToQuoteItem', () => {
  const libraryItem = LibraryItemSchema.parse({
    id: LI,
    workspaceId: WS,
    name: 'Nadzór autorski',
    description: 'Wizyta na budowie',
    unitPriceCents: 25000,
    kind: 'item',
  });

  it('przenosi dane i ustawia libraryItemId', () => {
    const item = libraryItemToQuoteItem(libraryItem);
    expect(item).toMatchObject({
      kind: 'item',
      name: 'Nadzór autorski',
      description: 'Wizyta na budowie',
      qty: 1,
      unitPriceCents: 25000,
      enabled: true,
      libraryItemId: LI,
    });
    expect(item.id).not.toBe(LI);
  });

  it('pozwala nadpisać pola przy wstawianiu do wyceny', () => {
    expect(libraryItemToQuoteItem(libraryItem, { qty: 3, enabled: false })).toMatchObject({
      qty: 3,
      enabled: false,
    });
  });
});

describe('librarySnapshotToQuoteItem', () => {
  it('tworzy pozycję wyceny ze snapshotu grupy', () => {
    const snapshot = LibraryItemSnapshotSchema.parse({
      name: 'Rabat pakietowy',
      kind: 'discount',
      unitPriceCents: 50000,
      libraryItemId: LI,
    });
    expect(librarySnapshotToQuoteItem(snapshot)).toMatchObject({
      kind: 'discount',
      name: 'Rabat pakietowy',
      qty: 1,
      unitPriceCents: 50000,
      enabled: true,
      libraryItemId: LI,
    });
  });
});
