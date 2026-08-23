import { calcStageDays, type ScheduleBody, type ScheduleStage } from '@/domain/schedule';
import type { Room } from '@/domain/quote';

/**
 * Reguły treści dokumentu „Szacowany termin" (F5.3).
 *
 * Czyste funkcje, bo `@react-pdf` renderuje do **binarnego PDF-a** — szukanie
 * tekstu w tym wyniku jest testem, który zawsze przechodzi albo zawsze pada,
 * niezależnie od tego, co dokument naprawdę zawiera (pułapka z T-13).
 */

/** Etapy, które wchodzą do dokumentu: tylko włączone i tylko z jakimś czasem. */
export function printableStages(schedule: ScheduleBody, rooms: Room[]): ScheduleStage[] {
  return schedule.stages.filter((stage) => stage.enabled && calcStageDays(stage, rooms) > 0);
}

/**
 * Etapy zależne od pomieszczeń — to one tworzą kolumny macierzy.
 *
 * Do tabeli `pomieszczenia × etapy` bierzemy **wyłącznie** te, które od
 * pomieszczeń zależą. Kolumna dla etapu liczonego na cały projekt miałaby
 * w każdym wierszu to samo, więc nie niosłaby informacji — a zabierałaby
 * szerokość, której na A4 nie ma w nadmiarze.
 */
export function roomStages(schedule: ScheduleBody, rooms: Room[]): ScheduleStage[] {
  return printableStages(schedule, rooms).filter((stage) => stage.roomScope !== 'none');
}

/** Etapy liczone na cały projekt — lista pod macierzą. */
export function projectStages(schedule: ScheduleBody, rooms: Room[]): ScheduleStage[] {
  return printableStages(schedule, rooms).filter((stage) => stage.roomScope === 'none');
}

/** Czy dane pomieszczenie wchodzi do tego etapu (kolumna ✓ / —). */
export function stageCoversRoom(stage: ScheduleStage, room: Room): boolean {
  if (stage.roomScope === 'none') return false;
  if (stage.roomScope === 'visual') return room.includedInVisual;
  if (stage.roomScope === 'technical') return room.includedInTechnical;
  return true;
}

/**
 * Pomieszczenia, które w ogóle trafiają do dokumentu.
 *
 * Pomieszczenie odznaczone w OBU częściach nie wchodzi do żadnego etapu, więc
 * jego wiersz byłby pasem myślników — informacją, że czegoś nie ma. Klient
 * czyta dokument o tym, co robimy.
 */
export function printableRooms(rooms: Room[]): Room[] {
  return rooms.filter((room) => room.includedInVisual || room.includedInTechnical);
}

/** Dni etapu przypadające na jedno pomieszczenie (bez bazy, bez krotności). */
export function stageRoomDays(stage: ScheduleStage, room: Room): number {
  if (!stageCoversRoom(stage, room)) return 0;
  if (room.roomTypeId === null) return stage.defaultPerRoomDays;
  return stage.perRoomDays[room.roomTypeId] ?? stage.defaultPerRoomDays;
}

/** Etykieta pomieszczenia w tabeli: „Salon ×2" przy krotności większej niż 1. */
export function roomHeading(room: Room, fallback: string): string {
  const label = room.label.trim() === '' ? fallback : room.label;
  return room.qty > 1 ? `${label} ×${room.qty}` : label;
}
