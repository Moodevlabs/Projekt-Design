import { Font } from '@react-pdf/renderer';
import type { FontFamily } from '@/domain/brand/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('pdf.fonts');

/**
 * Rejestracja fontów do PDF.
 *
 * **Pliki `.ttf` nie leżą jeszcze w repozytorium** — to decyzja licencyjna
 * (każdy z tych krojów ma własne warunki redystrybucji), a nie przeoczenie.
 * Dopóki ich nie ma, `@react-pdf` renderuje wbudowaną Helveticą, która **nie
 * zawiera polskich znaków**: „Zażółć gęślą jaźń" wyjdzie z dziurami.
 *
 * Żeby to domknąć, wystarczy wrzucić pliki 400 i 700 dla każdego kroju do
 * `src/pdf/fonts/` pod nazwami z `FONT_FILES` — `registerPdfFonts()` samo je
 * podłączy, bo Vite rozwiązuje te ścieżki w czasie budowania.
 */

/** Nazwy plików, których szuka rejestracja. Warianty: 400 (normal) i 700 (bold). */
export const FONT_FILES: Record<FontFamily, { normal: string; bold: string }> = {
  Lato: { normal: 'Lato-Regular.ttf', bold: 'Lato-Bold.ttf' },
  Inter: { normal: 'Inter-Regular.ttf', bold: 'Inter-Bold.ttf' },
  Playfair: { normal: 'PlayfairDisplay-Regular.ttf', bold: 'PlayfairDisplay-Bold.ttf' },
  'DM Sans': { normal: 'DMSans-Regular.ttf', bold: 'DMSans-Bold.ttf' },
  'Source Serif': { normal: 'SourceSerif4-Regular.ttf', bold: 'SourceSerif4-Bold.ttf' },
};

/**
 * Pliki fontów wciągnięte przez Vite. `eager: false` nie miałoby sensu —
 * rejestracja musi znać URL-e od razu, zanim ruszy render.
 */
const files = import.meta.glob<string>('./*.ttf', { eager: true, query: '?url', import: 'default' });

let registered = false;
let done = false;

/** Czy udało się zarejestrować komplet fontów (a więc czy PDF ma polskie znaki). */
export function pdfFontsRegistered(): boolean {
  return registered;
}

/**
 * Rejestruje fonty raz na proces. Bezpieczna do wielokrotnego wywołania —
 * `@react-pdf` trzyma własny rejestr, a podwójna rejestracja tego samego kroju
 * nadpisuje wpis i marnuje czas przy każdym renderze.
 */
export function registerPdfFonts(): boolean {
  if (done) return registered;
  done = true;

  const brakujace: string[] = [];

  for (const [family, variants] of Object.entries(FONT_FILES) as [
    FontFamily,
    { normal: string; bold: string },
  ][]) {
    const normal = files[`./${variants.normal}`];
    const bold = files[`./${variants.bold}`];

    if (!normal || !bold) {
      brakujace.push(family);
      continue;
    }

    Font.register({
      family,
      fonts: [
        { src: normal, fontWeight: 400 },
        { src: bold, fontWeight: 700 },
      ],
    });
  }

  registered = brakujace.length === 0;

  if (!registered) {
    log.warn(
      'Brak plików fontów — PDF wyrenderuje się Helveticą, BEZ polskich znaków. ' +
        'Wrzuć pliki do src/pdf/fonts/ (patrz FONT_FILES).',
      { brakujace },
    );
  }

  return registered;
}
