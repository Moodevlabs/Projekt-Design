import type { Item, QuoteBody, Room } from './schema';
import type { TextContext } from './template-text';

/**
 * Kontekst do podstawienia placeholderów (F4.2).
 *
 * **Jedno źródło dla podglądu w edytorze i dla PDF.** Gdyby każde z tych miejsc
 * składało kontekst po swojemu, opis w podglądzie i opis w wysłanej ofercie
 * mogłyby wymieniać inne pomieszczenia — a to dokładnie ta klasa błędu, która
 * wyszła przy kwotach pozycji w T-35 (trzy miejsca, trzy obliczenia).
 */

/**
 * To, co w dokumencie jest wspólne dla wszystkich tekstów.
 *
 * Świadomie **rozbite na kawałki zamiast całego `QuoteBody`**: wiersze edytora
 * są zmemoizowane, a `body` dostaje nową referencję przy każdym naciśnięciu
 * klawisza. Przekazanie go w dół przerysowywałoby wszystkie pozycje przy
 * każdej literze. `rooms` i `client` zmieniają referencję tylko wtedy, gdy
 * naprawdę się zmienią (immer dzieli strukturę).
 */
export interface DocumentTextInfo {
  rooms: Room[];
  client: string;
  /** Data ważności — już sformatowana, bo format należy do prezentacji. */
  validUntil?: string;
}

/** Wyciąga wspólne dane z dokumentu (dla PDF, gdzie `body` i tak jest pod ręką). */
export function documentTextInfo(body: QuoteBody, validUntil?: string): DocumentTextInfo {
  return {
    rooms: body.rooms,
    client: body.client.name,
    ...(validUntil === undefined ? {} : { validUntil }),
  };
}

/** Kontekst dla tekstów całego dokumentu: wstęp, opis projektu. */
export function quoteTextContext(doc: DocumentTextInfo): TextContext {
  return {
    rooms: doc.rooms,
    client: doc.client,
    ...(doc.validUntil === undefined ? {} : { validUntil: doc.validUntil }),
  };
}

/**
 * Kontekst dla opisu pojedynczej pozycji.
 *
 * Dokłada to, co należy do wiersza: pomieszczenie bloku, ilość i liczbę
 * kadrów. `{frames}` podajemy **tylko dla pozycji liczonej za kadr** — przy
 * innych trybach ta liczba nic nie znaczy, a wstawienie jedynki byłoby
 * zmyślaniem. Bez wartości placeholder zostaje dosłownie i widać pomyłkę.
 */
export function itemTextContext(doc: DocumentTextInfo, item: Item): TextContext {
  const room = item.roomId ? (doc.rooms.find((r) => r.id === item.roomId) ?? null) : null;

  return {
    ...quoteTextContext(doc),
    room,
    qty: item.qty,
    ...(item.pricing.mode === 'per_frame' ? { frames: item.frames ?? 1 } : {}),
  };
}
