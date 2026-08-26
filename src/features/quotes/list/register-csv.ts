import type { QuoteRegisterRow } from '@/data/repos/quotes.repo';
import { toCsv } from '@/lib/csv';
import { buildXlsx, type XlsxValue } from '@/lib/xlsx';
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

/**
 * Wiersze rejestru — wspólne dla CSV i XLSX.
 *
 * Jedno źródło kolejności i zawartości kolumn. Dwie kopie rozjechałyby się
 * przy pierwszej zmianie, a użytkownik dostałby dwa różne „rejestry".
 */
export function registerRows(rows: readonly QuoteRegisterRow[]): XlsxValue[][] {
  return rows.map((row, index) => [
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
  ]);
}

export function registerCsv(rows: readonly QuoteRegisterRow[]): string {
  return toCsv(REGISTER_HEADER, registerRows(rows));
}

/**
 * Ten sam rejestr jako XLSX.
 *
 * Po co, skoro CSV się otwiera: w XLSX **liczby są liczbami**. W CSV Excel
 * zgaduje typ kolumny i numer oferty `2026/08/0012` bywa czytany jako data.
 * Tu LP jest liczbą, reszta tekstem, i nic się nie „poprawia" samo.
 */
export function registerXlsx(rows: readonly QuoteRegisterRow[]): Uint8Array {
  return buildXlsx(REGISTER_HEADER, registerRows(rows), 'Rejestr ofert');
}

/** Nazwa pliku rejestru — z datą, bo taki plik zapisuje się co jakiś czas. */
export function registerFileName(today: string, format: 'csv' | 'xlsx' = 'csv'): string {
  return `rejestr-ofert-${data(today)}.${format}`;
}
