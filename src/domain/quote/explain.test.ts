import { describe, expect, it } from 'vitest';
import { calcItemUnits } from './calc';
import { explainItemPrice, isUnpinnedInRoomBlock } from './explain';
import { newItem, newRoom } from './factory';
import { newId } from '../id';
import type { Item } from './schema';

const KUCHNIA = newId();

const rooms = [
  newRoom({ label: 'Kuchnia', roomTypeId: KUCHNIA, qty: 2 }),
  newRoom({ label: 'Salon', includedInTechnical: false }),
  newRoom({ label: 'Łazienka' }),
];

const perRoom = (partial: Partial<Item> = {}): Item =>
  newItem({
    pricing: {
      mode: 'per_room',
      baseCents: 20_000,
      perRoomCents: { [KUCHNIA]: 35_000 },
      defaultPerRoomCents: 25_000,
      roomScope: 'technical',
    },
    ...partial,
  });

describe('explainItemPrice', () => {
  it('usługa globalna: baza + pomieszczenia w zasięgu, suma składników = kalkulacja', () => {
    const item = perRoom();
    const explanation = explainItemPrice(item, rooms);
    if (explanation.kind !== 'global') throw new Error(explanation.kind);

    // Salon jest poza częścią techniczną — nie ma go w rachunku.
    expect(explanation.rooms.map((part) => part.label)).toEqual(['Kuchnia', 'Łazienka']);
    expect(explanation.roomsQty).toBe(3);
    expect(explanation.baseUnits).toBe(20_000);
    expect(explanation.missingRates).toBe(false);

    const suma =
      explanation.baseUnits + explanation.rooms.reduce((sum, part) => sum + part.units, 0);
    expect(suma * explanation.itemQty).toBe(calcItemUnits(item, rooms));
    expect(explanation.units).toBe(20_000 + 2 * 35_000 + 25_000);
  });

  it('pozycja w bloku: jedno pomieszczenie, bez bazy', () => {
    const item = perRoom({ roomId: rooms[0]!.id });
    const explanation = explainItemPrice(item, rooms);
    if (explanation.kind !== 'room') throw new Error(explanation.kind);
    expect(explanation.room).toMatchObject({ label: 'Kuchnia', qty: 2, rateUnits: 35_000 });
    expect(explanation.units).toBe(70_000);
    expect(explanation.units).toBe(calcItemUnits(item, rooms));
  });

  it('brak cennika: baza 0 i stawki 0', () => {
    const item = perRoom({
      pricing: {
        mode: 'per_room',
        baseCents: 0,
        perRoomCents: {},
        defaultPerRoomCents: 0,
        roomScope: 'all',
      },
    });
    const explanation = explainItemPrice(item, rooms);
    expect(explanation).toMatchObject({ kind: 'global', missingRates: true, units: 0 });
  });

  it('nadpisanie ręczne i wycena indywidualna mają własne rodzaje', () => {
    expect(explainItemPrice(perRoom({ priceOverrideCents: 99_000 }), rooms)).toEqual({
      kind: 'override',
      units: 99_000,
    });
    expect(explainItemPrice(perRoom({ unitPriceCents: null }), rooms)).toEqual({
      kind: 'individual',
    });
    // Nadpisanie bije indywidualną — pozycja ma kwotę, więc jest w sumie.
    expect(
      explainItemPrice(perRoom({ unitPriceCents: null, priceOverrideCents: 1 }), rooms).kind,
    ).toBe('override');
  });

  it('wizualizacja: stawka pomieszczenia + baza × kadry', () => {
    const item = newItem({
      roomId: rooms[0]!.id,
      frames: 3,
      pricing: {
        mode: 'per_frame',
        baseCents: 5_000,
        perRoomCents: { [KUCHNIA]: 35_000 },
        defaultPerRoomCents: 25_000,
      },
    });
    const explanation = explainItemPrice(item, rooms);
    if (explanation.kind !== 'frame') throw new Error(explanation.kind);
    expect(explanation).toMatchObject({ rateUnits: 35_000, baseUnits: 5_000, frames: 3 });
    expect(explanation.room?.qty).toBe(2);
    expect(explanation.units).toBe((35_000 + 3 * 5_000) * 2);
  });

  it('zwykła pozycja nie ma czego tłumaczyć', () => {
    expect(explainItemPrice(newItem({ qty: 2, unitPriceCents: 100 }), rooms)).toEqual({
      kind: 'flat',
      units: 200,
    });
  });
});

describe('isUnpinnedInRoomBlock', () => {
  it('parametryczna pozycja w bloku bez przypięcia = liczy wszystkie pomieszczenia', () => {
    expect(isUnpinnedInRoomBlock(perRoom(), rooms[0]!.id)).toBe(true);
    expect(isUnpinnedInRoomBlock(perRoom({ roomId: rooms[0]!.id }), rooms[0]!.id)).toBe(false);
  });

  it('poza blokiem i dla zwykłej pozycji nie ma o czym mówić', () => {
    expect(isUnpinnedInRoomBlock(perRoom(), null)).toBe(false);
    expect(isUnpinnedInRoomBlock(newItem(), rooms[0]!.id)).toBe(false);
  });
});
