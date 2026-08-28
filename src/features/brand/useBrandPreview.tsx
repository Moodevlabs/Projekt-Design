import { useCallback, useState } from 'react';
import type { BrandKit } from '@/domain/brand/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('brand.preview');

export interface BrandPreviewState {
  rendering: boolean;
  error: string | null;
}

/**
 * Podgląd oferty dla ustawień brandingu — **na żądanie**, nie na żywo.
 *
 * ## Dlaczego nie na żywo
 *
 * Podgląd był wcześniej odświeżany po każdej zmianie i osadzany w stronie:
 * najpierw jako `<object type="application/pdf">`, potem jako strony rysowane
 * na kanwie przez pdf.js. Na macOS żadne z tych rozwiązań nie pokazywało
 * dokumentu — webview, na którym Tauri tam stoi, jest pod tym względem
 * kapryśny i nie zgłasza przy tym błędu, więc użytkownik dostawał białe pole
 * bez żadnej wskazówki, co poszło nie tak.
 *
 * Zamiast trzeciego podejścia do osadzania robimy rzecz, która działa wszędzie
 * i zawsze: generujemy prawdziwy plik i oddajemy go **systemowej przeglądarce
 * PDF**. Ta na pewno umie go wyświetlić, pozwala powiększyć i wydrukować
 * próbnie, a przy okazji pokazuje dokument dokładnie tak, jak zobaczy go
 * inwestor. Ceną jest jedno kliknięcie — uczciwa zamiana za podgląd, który
 * na połowie maszyn nie działał.
 *
 * Przy okazji znika debounce i przerysowywanie w tle: render PDF-u przestał
 * chodzić przy każdym naciśnięciu klawisza w polu koloru.
 *
 * **Renderujemy SZKIC, nie zapisany brand kit** — to się nie zmienia. Podgląd
 * pokazujący stan z bazy byłby bezużyteczny dokładnie wtedy, gdy jest
 * potrzebny: w trakcie dobierania kolorów.
 */
export function useBrandPreview(draft: BrandKit | null, logoDataUrl: string | null) {
  const [state, setState] = useState<BrandPreviewState>({ rendering: false, error: null });

  const generate = useCallback(async (): Promise<Uint8Array | null> => {
    if (!draft) return null;

    setState({ rendering: true, error: null });
    try {
      // Generator ładujemy dynamicznie — to kilkaset kilobajtów, których nie
      // ma po co wciągać do ekranu, dopóki nikt nie poprosi o podgląd.
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

      setState({ rendering: false, error: null });
      return new Uint8Array(await blob.arrayBuffer());
    } catch (error) {
      log.error('Podglad brandingu nieudany', error);
      setState({ rendering: false, error: previewError(error) });
      return null;
    }
  }, [draft, logoDataUrl]);

  return { ...state, generate };
}

function previewError(error: unknown): string {
  return error instanceof Error ? error.message : 'Nie udało się wygenerować podglądu.';
}
