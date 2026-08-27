import { useEffect, useRef, useState } from 'react';
import type { BrandKit } from '@/domain/brand/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('brand.preview');

/** Ile ciszy czekamy, zanim przerysujemy podgląd (04-PDF §4). */
const DEBOUNCE_MS = 500;

export interface BrandPreviewState {
  /** Adres blobu do wyświetlenia; `null`, dopóki nic nie wyrenderowano. */
  url: string | null;
  rendering: boolean;
  error: string | null;
}

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
 *  - **Zwalniamy poprzedni adres blobu.** Bez tego każda zmiana zostawia
 *    kilkusetkilobajtowy plik w pamięci karty aż do przeładowania.
 *  - **Wyścig renderów.** Wolniejszy render rozpoczęty wcześniej nie może
 *    nadpisać świeższego wyniku — stąd licznik pokoleń.
 */
export function useBrandPreview(draft: BrandKit | null, logoDataUrl: string | null) {
  const [state, setState] = useState<BrandPreviewState>({
    url: null,
    rendering: false,
    error: null,
  });

  /** Numer najnowszego żądania — starsze wyniki odrzucamy. */
  const generation = useRef(0);
  /** Adres pokazywany w tej chwili; zwalniamy go dopiero po podmianie. */
  const currentUrl = useRef<string | null>(null);

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
          ] = await Promise.all([
            import('@react-pdf/renderer'),
            import('@/pdf/QuotePdfDocument'),
            import('@/pdf/theme'),
            import('@/pdf/fonts/register'),
            import('@/pdf/sample-quote'),
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

          const url = URL.createObjectURL(blob);
          if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
          currentUrl.current = url;
          setState({ url, rendering: false, error: null });
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

  // Sprzątanie ostatniego blobu przy odmontowaniu — osobno, bo efekt wyżej
  // czyści tylko timer i biegnie przy każdej zmianie szkicu.
  useEffect(() => {
    return () => {
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
      currentUrl.current = null;
    };
  }, []);

  return state;
}

function previewError(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się wygenerować podglądu.';
}
