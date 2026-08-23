/**
 * Nazwa pomieszczenia po zmianie jego typu.
 *
 * Wybór typu ze słownika ma **nazywać** pomieszczenie — nikt nie wybiera
 * „Kuchnia", żeby pozycja dalej nazywała się „Nowe pomieszczenie". Ale nazwa
 * bywa też wpisana ręcznie („Kuchnia z jadalnią") i takiej nadpisywać nie
 * wolno: to jedyne miejsce, w którym użytkownik opisuje SWÓJ układ, a nie
 * wybiera z listy.
 *
 * Rozstrzygamy to pytaniem, czy dotychczasowa nazwa **pochodzi od automatu**:
 * jest pusta, jest wartością domyślną, albo jest nazwą typu wybranego
 * poprzednio. Tylko wtedy ją podmieniamy.
 *
 * Nazwę **kopiujemy**, a nie wyliczamy przy każdym renderze. Wycena jest
 * migawką: późniejsza zmiana nazwy typu w ustawieniach nie ma prawa przemianować
 * pomieszczeń w ofertach, które już poszły do klientów — ta sama zasada co przy
 * stawce godzinowej i przy kaskadzie z biblioteki.
 */
export interface RoomLabelChange {
  /** Nazwa, którą pomieszczenie ma teraz. */
  currentLabel: string;
  /** Nazwa typu wybranego DOTYCHCZAS (`null`, gdy typu nie było). */
  previousTypeName: string | null;
  /** Nazwa typu wybieranego TERAZ (`null` = „własne", czyli spoza słownika). */
  nextTypeName: string | null;
  /** Nazwa, którą dostaje świeżo dodane pomieszczenie. */
  defaultLabel: string;
}

/** Czy nazwa pochodzi od automatu, czy napisał ją człowiek. */
export function isAutoRoomLabel(
  currentLabel: string,
  previousTypeName: string | null,
  defaultLabel: string,
): boolean {
  const label = currentLabel.trim();
  if (label === '') return true;
  if (label === defaultLabel) return true;
  return previousTypeName !== null && label === previousTypeName;
}

/**
 * Nazwa po zmianie typu — albo dotychczasowa, jeśli należy do użytkownika.
 *
 * Przejście na „własne" (`nextTypeName: null`) **nie czyści nazwy**: człowiek
 * chce wtedy zwykle dopisać coś swojego, a puste pole kazałoby mu zaczynać
 * od zera.
 */
export function nextRoomLabel({
  currentLabel,
  previousTypeName,
  nextTypeName,
  defaultLabel,
}: RoomLabelChange): string {
  if (nextTypeName === null) return currentLabel;
  if (!isAutoRoomLabel(currentLabel, previousTypeName, defaultLabel)) return currentLabel;
  return nextTypeName;
}
