import type { QuoteRegisterRow } from '@/data/repos/quotes.repo';
import { toCsv } from '@/lib/csv';
import { pl } from '@/i18n/pl';

/**
 * Rejestr ofert w układzie arkusza `OFERTY` (F7.1).
 *
 * Nagłówki i kolejność kolumn są **z arkusza klienta**, nie z naszej listy:
 * ludzie, którzy przenoszą się z Excela, chcą dostać z powrotem swój stary
 * arkusz. Zmiana kolejności kolumn zepsułaby im formuły w plikach, do których
 * ten eksport wkleją.
 */
export const REGISTER_HEADER = [
  'LP',
  'DATA',
  'NR OFERTY',
  'RODZAJ',
  'INWESTOR',
  'TELEFON',
  'E-MAIL',
  'MIASTO',
  'NOTATKI',
] as const;

/** Data w formacie, który Excel w PL rozpozna jako datę: `RRRR-MM-DD`. */
function data(iso: string): string {
  return iso.slice(0, 10);
}

export function registerCsv(rows: readonly QuoteRegisterRow[]): string {
  return toCsv(
    REGISTER_HEADER,
    rows.map((row, index) => [
      // LP liczymy przy eksporcie, a nie trzymamy w bazie: to numer PORZADKOWY
      // w tym pliku, a nie identyfikator czegokolwiek.
      index + 1,
      data(row.createdAt),
      row.number ?? '',
      pl.quotes.docKind[row.docKind],
      row.clientName ?? '',
      row.clientPhone,
      row.clientEmail,
      row.city ?? '',
      row.internalNotes ?? '',
    ]),
  );
}

/** Nazwa pliku rejestru — z datą, bo taki plik zapisuje się co jakiś czas. */
export function registerFileName(today: string): string {
  return `rejestr-ofert-${data(today)}.csv`;
}
