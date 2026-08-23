/**
 * CSV dla Excela w polskiej lokalizacji.
 *
 * Dwie rzeczy, bez których plik otwiera się źle i użytkownik uznaje eksport
 * za zepsuty:
 *
 *  - **Separator `;`, nie `,`.** Excel w PL czyta przecinek jako separator
 *    dziesiętny, więc plik z przecinkami ląduje w jednej kolumnie.
 *  - **BOM UTF-8 na początku.** Bez niego Excel zgaduje stronę kodową
 *    i „Kraków" robi się „KrakÃ³w".
 *
 * To nie jest generyczna biblioteka CSV — to jest eksport, który ma się
 * otworzyć w Excelu klienta bez jednego kliknięcia w kreatorze importu.
 */

/** Znak BOM — Excel po nim rozpoznaje UTF-8 bez pytania. */
export const UTF8_BOM = '﻿';

const SEPARATOR = ';';

/**
 * Co wolno wlozyc do komorki.
 *
 * Nie `unknown`: obiekt zamieniony na tekst da `[object Object]` i wyladuje
 * w pliku klienta jako smiec. Wolimy blad kompilacji niz taki eksport.
 */
export type CsvValue = string | number | null | undefined;

/**
 * Escapuje jedną komórkę.
 *
 * Cudzysłowy podwajamy (zasada RFC 4180). Cytujemy pole, gdy zawiera
 * separator, cudzysłów albo znak nowej linii — notatki wewnętrzne bywają
 * wielolinijkowe i bez cytowania rozsypałyby cały plik.
 */
function cell(value: CsvValue): string {
  const text = value === null || value === undefined ? '' : String(value);

  // Wiodace `=`, `+`, `-`, `@` Excel traktuje jak formule (CSV injection).
  // Poprzedzamy je apostrofem — komorka wyglada tak samo, a nie wykonuje sie.
  const bezpieczny = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[";\r\n]/.test(bezpieczny) ? `"${bezpieczny.replace(/"/g, '""')}"` : bezpieczny;
}

/** Składa wiersze w tekst CSV gotowy do zapisania na dysk. */
export function toCsv(header: readonly string[], rows: readonly CsvValue[][]): string {
  const linie = [header, ...rows].map((row) => row.map(cell).join(SEPARATOR));
  // CRLF, bo tego oczekuje Excel na Windowsie — to tam ten plik trafi.
  return UTF8_BOM + linie.join('\r\n') + '\r\n';
}
