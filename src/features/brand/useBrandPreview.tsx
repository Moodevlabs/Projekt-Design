import { useEffect, useRef, useState } from 'react';
import type { BrandKit } from '@/domain/brand/schema';
import type { RasterPage } from '@/pdf/rasterize';
import { createLogger } from '@/lib/logger';

const log = createLogger('brand.preview');

/** Ile ciszy czekamy, zanim przerysujemy podgląd (04-PDF §4). */
const DEBOUNCE_MS = 500;

export interface BrandPreviewState {
  /** Strony dokumentu jako obrazki; pusta lista, dopóki nic nie wyrenderowano. */
  pages: RasterPage[];
  /**
   * Bajty wygenerowanego PDF-u — do otwarcia w czytniku systemowym.
   * `null`, dopóki pierwszy render się nie skończy.
   */
  bytes: Uint8Array | null;
  rendering: boolean;
  error: string | null;
}

const EMPTY: BrandPreviewState = { pages: [], bytes: null, rendering: false, error: null };

/**
 * Podgląd oferty na żywo dla ustawień brandingu.
 *
 * Rzeczy, które trzeba tu zrobić dobrze:
 *
 *  - **Renderujemy SZKIC, nie zapisany brand kit.** Podgląd pokazujący stan
 *    z bazy byłby bezużyteczny dokładnie wtedy, gdy jest potrzebny — w trakcie
 *    dobierania kolorów.
 *  - **Debounce.** Pełny render PDF przy każdym naciśnięciu klawisza w polu
 *    koloru zamieniłby formularz w pokaz slajdów.
 *  - **Wyścig renderów.** Wolniejszy render rozpoczęty wcześniej nie może
 *    nadpisać świeższego wyniku — stąd licznik pokoleń.
 *
 * Wynikiem są **obrazki stron**, a nie adres blobu (poprawka z 2026-08-28).
 * Blob trafiał do `<object type="application/pdf">`, a WKWebView — czyli
 * webview Tauri na macOS — PDF-ów w ramkach nie renderuje. Efektem było białe
 * pole bez żadnego błędu. Rysunek na canvasie wygląda tak samo wszędzie.
 * Bajty zwracamy obok, bo przycisk „otwórz w czytniku systemowym" ma pokazać
 * PRAWDZIWY plik, a nie jego obrazek.
 */
export function useBrandPreview(draft: BrandKit | null, logoDataUrl: string | null) {
  const [state, setState] = useState<BrandPreviewState>(EMPTY);

  /** Numer najnowszego żądania — starsze wyniki odrzucamy. */
  const generation = useRef(0);

  const signature = draft ? JSON.stringify([draft, logoDataUrl]) : null;

  useEffect(() => {
    if (!draft) return;

    const mine = ++generation.current;
    setState((previous) => ({ ...previous, rendering: true, error: null }));

    const timer = setTimeout(() => {
      void (async () => {
        try {
          // Generator ładujemy dynamicznie — to kilkaset kilobajtów, których
          // nie ma po co wciągać do ekranu, gdzie nikt nie otworzy podglądu.
          const [
            { pdf },
            { QuotePdfDocument },
            { buildPdfTheme },
            { isPdfFontRegistered, registerPdfFonts },
            { sampleQuoteBody },
            { rasterizePdf },
          ] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/pdf/QuotePdfDocument'),
            import('@/pdf/theme'),
            import('@/pdf/fonts/register'),
            import('@/pdf/sample-quote'),
            import('@/pdf/rasterize'),
          ]);

          registerPdfFonts();
          const fontsOk = isPdfFontRegistered(draft.fontFamily);
          const body = sampleQuoteBody();

          const blob = await pdf(
            <QuotePdfDocument
              body={body}
              theme={buildPdfTheme(draft, fontsOk)}
              brandKit={draft}
              number="OFERTA/2026/01/0001"
              issueDate={body.issueDate ?? '2026-01-15'}
              currency="PLN"
              logoDataUrl={logoDataUrl}
            />,
          ).toBlob();

          if (generation.current !== mine) return;

          const bytes = new Uint8Array(await blob.arrayBuffer());
          const pages = await rasterizePdf(bytes);

          if (generation.current !== mine) return;
          setState({ pages, bytes, rendering: false, error: null });
        } catch (error) {
          if (generation.current !== mine) return;
          log.error('Podglad brandingu nieudany', error);
          setState((previous) => ({ ...previous, rendering: false, error: previewError(error) }));
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `signature` zastępuje `draft`: obiekt szkicu ma nową referencję przy
    // każdym renderze formularza, więc porównujemy zawartość.
  }, [signature, draft, logoDataUrl]);

  return state;
}

function previewError(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się wygenerować podglądu.';
}
