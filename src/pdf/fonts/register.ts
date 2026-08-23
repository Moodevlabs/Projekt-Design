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

/**
 * Nazwy plików, których szuka rejestracja. Warianty: 400 (normal) i 700 (bold).
 *
 * Kroje wydawane w kilku **rozmiarach optycznych** (Inter 4.x: 18pt / 24pt /
 * 28pt) bierzemy w wersji **18pt** — to cięcie zaprojektowane do tekstu
 * ciągłego, a oferta to w większości tekst ciągły. 24pt i 28pt są rysowane pod
 * duże nagłówki i w akapicie wyglądają na zbyt wąskie. Pliki przemianuj na
 * nazwy z tej tabeli; wag pośrednich (Light, Medium, SemiBold) nie używamy.
 */
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

/** Kroje, dla których pliki faktycznie leżą w repo. */
const registered = new Set<FontFamily>();
let done = false;

/**
 * Czy DANY krój ma pliki, a więc czy PDF w nim złożony ma polskie znaki.
 *
 * Sprawdzamy **per krój, nie na komplet**. Wcześniej wystarczyło, że brakuje
 * jednego z pięciu, i wszystkie — łącznie z tymi wgranymi — spadały na
 * Helveticę. Z zewnątrz wyglądało to tak, jakby wrzucenie plików nic nie dało.
 */
export function isPdfFontRegistered(family: FontFamily): boolean {
  return registered.has(family);
}

/** Czy komplet krojów jest dostępny (diagnostyka, nie decyzja o renderze). */
export function allPdfFontsRegistered(): boolean {
  return registered.size === Object.keys(FONT_FILES).length;
}

/**
 * Rejestruje fonty raz na proces. Bezpieczna do wielokrotnego wywołania —
 * `@react-pdf` trzyma własny rejestr, a podwójna rejestracja tego samego kroju
 * nadpisuje wpis i marnuje czas przy każdym renderze.
 */
export function registerPdfFonts(): void {
  if (done) return;
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
    registered.add(family);
  }

  if (brakujace.length > 0) {
    log.warn(
      'Brak plików dla części krojów — oferta złożona jednym z nich wyrenderuje ' +
        'się Helveticą, czyli BEZ polskich znaków. Wrzuć pliki do src/pdf/fonts/ ' +
        '(nazwy w FONT_FILES).',
      { brakujace },
    );
  }
}
