import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { QuoteBody } from '@/domain/quote';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { quoteFileName } from './file-name';
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
    async ({ body, number, issueDate, currency, onExported }: ExportArgs) => {
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

        if (!runningInTauri()) {
          // W przeglądarce (`pnpm dev`) nie ma dialogu systemowego — pobieramy
          // plik po staremu, żeby dało się sprawdzić wynik bez budowania appki.
          downloadInBrowser(bytes, fileName);
          onExported?.();
          return;
        }

        const { save } = await import('@tauri-apps/plugin-dialog');
        const target = await save({
          defaultPath: fileName,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });

        // `null` znaczy, że użytkownik zamknął dialog — to nie jest błąd.
        if (!target) return;

        const savedPath = await saveFile(target, bytes);

        toast.success(pl.editor.pdfSaved, {
          action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
        });
        onExported?.();
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

function downloadInBrowser(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
