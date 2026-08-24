import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { QuoteBody } from '@/domain/quote';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { quoteFileName } from './file-name';
import { deliverPdf, type ArchiveRequest } from './export';
import { renderQuotePdf } from './render';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.export');

export interface ExportArgs {
  body: QuoteBody;
  number: string | null;
  issueDate: string;
  currency: string;
  /**
   * Wolane po UDANYM zapisie pliku — nie po kliknieciu „Eksportuj".
   *
   * Rozroznienie jest istotne: uzytkownik, ktory zamknal dialog zapisu albo
   * trafil na blad, niczego nie wyeksportowal i nie ma prawa dostac pytania
   * „oznaczyc jako wyslana?".
   */
  onExported?: () => void;
  /**
   * Kopia do archiwum klienta (T-56). `null`/pominiete = nie archiwizuj —
   * tak jest przy wycenie bez klienta i po odznaczeniu checkboxa.
   */
  archive?: ArchiveRequest | null;
}

/**
 * Eksport wyceny do PDF.
 *
 * Generator i sam `@react-pdf` ładujemy **dynamicznie**, przy pierwszym
 * eksporcie: to kilkaset kilobajtów, których nie ma sensu wciągać do bundla
 * ekranu logowania. Dzięki temu koszt płaci tylko ten, kto naprawdę drukuje
 * ofertę.
 */
export function useExportPdf() {
  const brandKit = useBrandKit();
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(
    async ({ body, number, issueDate, currency, onExported, archive }: ExportArgs) => {
      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        // Logo idzie do PDF jako data URL: `@react-pdf` w webview nie pobierze
        // podpisanego URL-a sam, a i tak chcemy je mieć w pliku, nie linkiem.
        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        // Render idzie do Web Workera, a przy jego niepowodzeniu na glowny
        // watek — patrz `render.ts`. Eksport nie ma prawa polec dlatego, ze
        // optymalizacja nie wypalila.
        const bytes = await renderQuotePdf({
          body,
          theme,
          brandKit: kit,
          number,
          issueDate,
          currency,
          logoDataUrl,
        });

        const fileName = quoteFileName(number, body.client.name);

        // Archiwizacja i zapis na dysk idą przez JEDNO wspolne wyjscie (§9.9).
        const { saved } = await deliverPdf({
          bytes,
          fileName,
          docType: 'quote',
          savedToast: pl.editor.pdfSaved,
          archive: archive ?? null,
        });

        // „Oznaczyc jako wyslana?" tylko po pliku, ktory naprawde powstal.
        if (saved) onExported?.();
      } catch (error) {
        log.error('Eksport PDF nieudany', error);
        toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed);
      } finally {
        setExporting(false);
      }
    },
    [brandKit.data],
  );

  return { exportPdf, exporting };
}
