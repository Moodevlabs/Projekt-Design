import { describe, expect, it } from 'vitest';
import { ItemSchema } from '../quote/schema';
import {
  LibraryGroupSchema,
  LibraryItemSchema,
  LibraryItemSnapshotSchema,
  libraryItemToQuoteItem,
  libraryItemToSnapshot,
  librarySnapshotToQuoteItem,
  quoteItemToLibrarySnapshot,
} from './schema';

const WS = '11111111-1111-4111-8111-111111111111';
const LI = '22222222-2222-4222-8222-222222222222';

describe('LibraryItemSchema', () => {
  it('uzupełnia wartości domyślne zgodne z migracją', () => {
    expect(
      LibraryItemSchema.parse({ id: LI, workspaceId: WS, name: 'Projekt koncepcyjny' }),
    ).toEqual({
      id: LI,
      workspaceId: WS,
      category: 'Inne',
      kind: 'item',
      name: 'Projekt koncepcyjny',
      description: '',
      unitPriceCents: 0,
      // Domyślne z T-60: ryczałt, bez ceny „od", aktywna, nie przykładowa.
      unit: 'lump',
      minPriceCents: null,
      active: true,
      isSample: false,
      categoryId: null,
      sortOrder: 0,
      // Wpis bez reguły liczy się jak przed cennikiem parametrycznym.
      pricing: { mode: 'flat' },
    });
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
      qty: 1,
      unitPriceCents: 12000,
      libraryItemId: null,
    });
  });

  it('zachowuje ilość zapisaną w zestawie', () => {
    // Zestaw „Kuchnia" to 14 m² projektu, nie jedna sztuka — snapshot musi
    // pamiętać ilość, inaczej wstawienie zestawu wyzerowałoby metraż do 1.
    const group = LibraryGroupSchema.parse({
      id: LI,
      workspaceId: WS,
      name: 'Kuchnia',
      items: [{ name: 'Projekt', unitPriceCents: 9000, qty: 14 }],
    });
    expect(group.items[0]?.qty).toBe(14);
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

  it('przenosi regułę cenową z biblioteki do wyceny', () => {
    // Sedno cennika parametrycznego: usługę opisuje się raz, w bibliotece.
    const parametryczna = LibraryItemSchema.parse({
      id: LI,
      workspaceId: WS,
      name: 'Projekt budowlany',
      unitPriceCents: 0,
      pricing: {
        mode: 'per_room',
        baseCents: 20_000,
        perRoomCents: {},
        defaultPerRoomCents: 1_500,
        roomScope: 'technical',
      },
    });

    const item = libraryItemToQuoteItem(parametryczna);
    expect(item.pricing).toEqual({
      mode: 'per_room',
      baseCents: 20_000,
      perRoomCents: {},
      defaultPerRoomCents: 1_500,
      roomScope: 'technical',
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

  it('przenosi ilość z zestawu do wyceny', () => {
    const snapshot = LibraryItemSnapshotSchema.parse({
      name: 'Projekt koncepcyjny',
      unitPriceCents: 9000,
      qty: 14,
    });
    expect(librarySnapshotToQuoteItem(snapshot).qty).toBe(14);
  });
});

describe('quoteItemToLibrarySnapshot', () => {
  const item = ItemSchema.parse({
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Wizualizacje 3D',
    description: 'Trzy ujęcia',
    qty: 3,
    unitPriceCents: 45000,
    enabled: false,
    libraryItemId: LI,
  });

  it('przenosi ilość i powiązanie z biblioteką', () => {
    expect(quoteItemToLibrarySnapshot(item)).toEqual({
      name: 'Wizualizacje 3D',
      description: 'Trzy ujęcia',
      kind: 'item',
      qty: 3,
      unitPriceCents: 45000,
      libraryItemId: LI,
    });
  });

  it('nie przenosi `enabled` ani `id` — to własność konkretnej wyceny', () => {
    const snapshot = quoteItemToLibrarySnapshot(item);
    expect(snapshot).not.toHaveProperty('enabled');
    expect(snapshot).not.toHaveProperty('id');
  });

  it('wynik przechodzi walidację snapshotu', () => {
    expect(LibraryItemSnapshotSchema.safeParse(quoteItemToLibrarySnapshot(item)).success).toBe(true);
  });
});

describe('libraryItemToSnapshot', () => {
  it('robi snapshot z pozycji bibliotecznej i wiąże go z jej wpisem', () => {
    const libraryItem = LibraryItemSchema.parse({
      id: LI,
      workspaceId: WS,
      name: 'Nadzór autorski',
      unitPriceCents: 25000,
    });
    expect(libraryItemToSnapshot(libraryItem)).toEqual({
      name: 'Nadzór autorski',
      description: '',
      kind: 'item',
      qty: 1,
      unitPriceCents: 25000,
      libraryItemId: LI,
    });
  });
});
