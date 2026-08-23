import type { Group, Item, QuoteBody, Room } from '@/domain/quote';

/**
 * Decyzje o tym, **co** trafia do dokumentu — wyjęte z komponentu, bo
 * `@react-pdf` renderuje do binarnego PDF-a i sprawdzenie tych reguł w teście
 * renderu wymagałoby czytania bajtów. Tutaj są zwykłymi funkcjami z testami,
 * a komponent tylko układa ich wynik na stronie.
 */

/** Wiersz „Pomieszczenia: …" z nagłówka (F1.5). Pusty, gdy pomieszczeń nie ma. */
export function roomsSummaryLine(rooms: Room[]): string {
  return rooms
    .map((room) => (room.qty > 1 ? `${room.label} x${room.qty}` : room.label))
    .join(', ');
}

/** Pozycje widoczne w dokumencie — z uwzględnieniem `showDisabledItems`. */
export function visibleItems(items: Item[], showDisabled: boolean): Item[] {
  return showDisabled ? items : items.filter((item) => item.enabled);
}

/**
 * Czy blok grupy w ogóle się drukuje.
 *
 * Pomieszczenie odznaczone w OBU częściach nie wchodzi do żadnej usługi, więc
 * w ofercie dla klienta jest tylko szumem — inaczej niż w edytorze, gdzie musi
 * być widoczne, żeby dało się je z powrotem włączyć.
 */
export function shouldPrintGroup(group: Group, rooms: Room[], showDisabled: boolean): boolean {
  if (visibleItems(group.items, showDisabled).length === 0) return false;

  if (group.roomId === null) return true;

  const room = rooms.find((candidate) => candidate.id === group.roomId);
  if (!room) return true;

  return room.includedInVisual || room.includedInTechnical;
}

/** Nagłówek bloku: etykieta pomieszczenia z ilością albo nazwa zwykłej grupy. */
export function groupHeading(group: Group, rooms: Room[]): string {
  const room = group.roomId
    ? rooms.find((candidate) => candidate.id === group.roomId)
    : undefined;

  if (!room) return group.name;
  return room.qty > 1 ? `${room.label} x${room.qty}` : room.label;
}

/** Kto podpisuje ofertę: pole z wyceny, a w jego braku — wystawiający z brand kitu. */
export function preparedByLine(
  body: QuoteBody,
  signerName: string | null,
  signerTitle: string | null,
): string {
  if (body.preparedBy) return body.preparedBy;
  return [signerName, signerTitle].filter(Boolean).join(', ');
}
