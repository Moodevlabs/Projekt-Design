import { priceListFileName, quoteFileName, scheduleFileName, stagesFileName } from './file-name';

/**
 * Plan pakietu dokumentów (F6.3) — czysta część eksportu.
 *
 * Osobno od renderowania, bo to są **reguły**, nie rysowanie: co da się
 * wyeksportować, w jakiej kolejności i pod jaką nazwą. Reguły da się
 * sprawdzić testem w milisekundy; render czterech PDF-ów nie.
 */

export type PackageDocKind = 'quote' | 'schedule' | 'stages' | 'priceList';

/**
 * Kolejność w pakiecie: oferta, termin, etapy, cennik.
 *
 * To kolejność, w jakiej inwestor to czyta — najpierw ile i kiedy, potem co
 * dokładnie wchodzi w zakres, a cennik dodatkowy na końcu, bo dotyczy rzeczy
 * spoza oferty.
 */
export const PACKAGE_ORDER: PackageDocKind[] = ['quote', 'schedule', 'stages', 'priceList'];

export interface PackageContents {
  /** Wycena jest zawsze — bez niej nie ma pakietu. */
  hasSchedule: boolean;
  hasStages: boolean;
  hasPriceList: boolean;
}

/**
 * Dokumenty, które ta wycena naprawdę ma.
 *
 * Nieistniejący dokument **nie pojawia się w dialogu jako odznaczony** — jest
 * go po prostu nie ma. Checkbox „Termin", którego nie da się zaznaczyć, to
 * pytanie bez odpowiedzi; brak pozycji mówi to samo bez pytania.
 */
export function availableDocs(contents: PackageContents): PackageDocKind[] {
  return PACKAGE_ORDER.filter((kind) => {
    if (kind === 'quote') return true;
    if (kind === 'schedule') return contents.hasSchedule;
    if (kind === 'stages') return contents.hasStages;
    return contents.hasPriceList;
  });
}

export interface PackagePart {
  kind: PackageDocKind;
  fileName: string;
}

/**
 * Co i pod jaką nazwą wyeksportować, w kolejności pakietu.
 *
 * Zaznaczenie dokumentu, którego wycena nie ma, jest ignorowane — stan
 * dialogu nie ma prawa wymusić renderu czegoś, czego nie ma.
 */
export function packagePlan(
  selected: readonly PackageDocKind[],
  contents: PackageContents,
  number: string | null,
  clientName: string,
): PackagePart[] {
  const dostepne = new Set(availableDocs(contents));
  const wybrane = new Set(selected);

  return PACKAGE_ORDER.filter((kind) => dostepne.has(kind) && wybrane.has(kind)).map((kind) => ({
    kind,
    fileName: partFileName(kind, number, clientName),
  }));
}

function partFileName(kind: PackageDocKind, number: string | null, clientName: string): string {
  if (kind === 'quote') return quoteFileName(number, clientName);
  if (kind === 'schedule') return scheduleFileName(number);
  if (kind === 'stages') return stagesFileName(number);
  return priceListFileName(number);
}

/** Nazwa scalonego pliku pakietu. */
export function packageFileName(number: string | null): string {
  // Ta sama zasada co przy pozostalych dokumentach: przyrostek odroznia plik,
  // bo caly pakiet nosi jeden numer wyceny.
  const base = quoteFileName(number, '').replace(/\.pdf$/, '');
  return `${base}-pakiet.pdf`;
}
