import { calcItemUnits, itemRoom } from './calc';
import type { Item, Room, RoomScope } from './schema';

/**
 * „Skąd ta kwota" — rozbicie wartości pozycji na składniki (T-128).
 *
 * Kalkulacja (`calcItemUnits`) zwraca jedną liczbę. Człowiek, który widzi
 * w wierszu 1 750 zł przy usłudze „od 250 zł", chce zobaczyć rachunek —
 * a rachunek musi pochodzić z **tej samej** logiki co liczba, inaczej edytor
 * pokazywałby wyjaśnienie innej kwoty niż ta w podsumowaniu. Dlatego rozbicie
 * żyje w domenie, obok kalkulacji, i jest przez nią sprawdzane w testach
 * (`suma składników === calcItemUnits`).
 *
 * Wszystkie liczby są w **jednostkach dokumentu** (grosze albo minuty) —
 * na złotówki zamienia je warstwa prezentacji przez `toCents`.
 */
export interface RoomPart {
  roomId: string;
  label: string;
  /** Ilość pomieszczenia („kuchnia ×2"). */
  qty: number;
  /** Stawka za jedno takie pomieszczenie. */
  rateUnits: number;
  /** `rateUnits × qty`. */
  units: number;
}

export type PriceExplanation =
  /** Nadpisanie ręczne — reguła zignorowana. */
  | { kind: 'override'; units: number }
  /** „Wycena indywidualna" — pozycja poza sumą. */
  | { kind: 'individual' }
  /** `qty × cena jednostkowa`. Dopisek nie jest potrzebny — obie liczby są w wierszu. */
  | { kind: 'flat'; units: number }
  /** Pozycja w bloku pomieszczenia: stawka × ilość TEGO pomieszczenia. */
  | { kind: 'room'; room: RoomPart; itemQty: number; units: number }
  /** Usługa globalna: baza + Σ po pomieszczeniach w zasięgu. */
  | {
      kind: 'global';
      baseUnits: number;
      scope: RoomScope;
      rooms: RoomPart[];
      /** Σ ilości pomieszczeń w zasięgu — to „7 pom." z dopisku. */
      roomsQty: number;
      itemQty: number;
      units: number;
      /** Baza 0 i wszystkie stawki 0 — usługa nie ma jeszcze cennika. */
      missingRates: boolean;
    }
  /** Wizualizacja: (stawka pomieszczenia + baza × kadry) × ilość pomieszczenia. */
  | {
      kind: 'frame';
      room: RoomPart | null;
      rateUnits: number;
      baseUnits: number;
      frames: number;
      itemQty: number;
      units: number;
    };

function roomInScope(room: Room, scope: RoomScope): boolean {
  if (scope === 'visual') return room.includedInVisual;
  if (scope === 'technical') return room.includedInTechnical;
  return true;
}

function rateFor(
  room: Room,
  perRoomCents: Record<string, number>,
  defaultPerRoomCents: number,
): number {
  if (room.roomTypeId === null) return defaultPerRoomCents;
  return perRoomCents[room.roomTypeId] ?? defaultPerRoomCents;
}

function roomPart(room: Room, rateUnits: number): RoomPart {
  return {
    roomId: room.id,
    label: room.label,
    qty: room.qty,
    rateUnits,
    units: rateUnits * room.qty,
  };
}

export function explainItemPrice(item: Item, rooms: Room[]): PriceExplanation {
  const units = calcItemUnits(item, rooms);

  if (item.priceOverrideCents !== null) return { kind: 'override', units };
  if (item.unitPriceCents === null) return { kind: 'individual' };

  const pricing = item.pricing;

  if (pricing.mode === 'per_room') {
    const pinned = itemRoom(item, rooms);
    if (pinned) {
      const rate = rateFor(pinned, pricing.perRoomCents, pricing.defaultPerRoomCents);
      return { kind: 'room', room: roomPart(pinned, rate), itemQty: item.qty, units };
    }

    const parts = rooms
      .filter((room) => roomInScope(room, pricing.roomScope))
      .map((room) =>
        roomPart(room, rateFor(room, pricing.perRoomCents, pricing.defaultPerRoomCents)),
      );

    const anyRate =
      pricing.baseCents !== 0 ||
      pricing.defaultPerRoomCents !== 0 ||
      Object.values(pricing.perRoomCents).some((rate) => rate !== 0);

    return {
      kind: 'global',
      baseUnits: pricing.baseCents,
      scope: pricing.roomScope,
      rooms: parts,
      roomsQty: parts.reduce((sum, part) => sum + part.qty, 0),
      itemQty: item.qty,
      units,
      missingRates: !anyRate,
    };
  }

  if (pricing.mode === 'per_frame') {
    const pinned = itemRoom(item, rooms);
    const rate = pinned
      ? rateFor(pinned, pricing.perRoomCents, pricing.defaultPerRoomCents)
      : pricing.defaultPerRoomCents;
    return {
      kind: 'frame',
      room: pinned ? roomPart(pinned, rate) : null,
      rateUnits: rate,
      baseUnits: pricing.baseCents,
      frames: item.frames ?? 1,
      itemQty: item.qty,
      units,
    };
  }

  return { kind: 'flat', units };
}

/**
 * Czy pozycja parametryczna leżąca w bloku pomieszczenia jest do niego
 * przypięta. `false` = pozycja sprzed T-126 (albo przeniesiona starą ścieżką):
 * liczy wszystkie pomieszczenia, choć stoi pod nagłówkiem jednego. Edytor ma
 * ją oznaczyć i dać „przypnij" — migracji nie robimy, bo zmieniłaby kwoty
 * wysłanych ofert.
 */
export function isUnpinnedInRoomBlock(item: Item, blockRoomId: string | null | undefined): boolean {
  if (!blockRoomId) return false;
  if (item.pricing.mode === 'flat') return false;
  return item.roomId !== blockRoomId;
}
