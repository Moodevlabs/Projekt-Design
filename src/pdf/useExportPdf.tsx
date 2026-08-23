import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { getLogoUrl } from '@/data/repos/brand.repo';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { QuoteBody } from '@/domain/quote';
import { createLogger } from '@/lib/logger';
import { quoteFileName } from './file-name';
import { buildPdfTheme } from './theme';
import { registerPdfFonts } from './fonts/register';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.export');

export interface ExportArgs {
  body: QuoteBody;
  number: string | null;
  issueDate: string;
  currency: string;
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
    async ({ body, number, issueDate, currency }: ExportArgs) => {
      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        const fontsOk = registerPdfFonts();
        const theme = buildPdfTheme(kit, fontsOk);

        // Logo idzie do PDF jako data URL: `@react-pdf` w webview nie pobierze
        // podpisanego URL-a sam, a i tak chcemy je mieć w pliku, nie linkiem.
        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = logoPath ? await fetchAsDataUrl(logoPath) : null;

        const [{ pdf }, { QuotePdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./QuotePdfDocument'),
        ]);

        const blob = await pdf(
          <QuotePdfDocument
            body={body}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            currency={currency}
            logoDataUrl={logoDataUrl}
          />,
        ).toBlob();

        const fileName = quoteFileName(number, body.client.name);

        if (!runningInTauri()) {
          // W przeglądarce (`pnpm dev`) nie ma dialogu systemowego — pobieramy
          // plik po staremu, żeby dało się sprawdzić wynik bez budowania appki.
          downloadInBrowser(blob, fileName);
          return;
        }

        const { save } = await import('@tauri-apps/plugin-dialog');
        const target = await save({
          defaultPath: fileName,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });

        // `null` znaczy, że użytkownik zamknął dialog — to nie jest błąd.
        if (!target) return;

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const savedPath = await saveFile(target, bytes);

        toast.success(pl.editor.pdfSaved, {
          action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
        });
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

/** Pobiera plik z prywatnego bucketa i zamienia na data URL. */
async function fetchAsDataUrl(path: string): Promise<string | null> {
  try {
    const url = await getLogoUrl(path);
    if (!url) return null;

    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // `readAsDataURL` daje string, ale typ `FileReader` dopuszcza też
        // ArrayBuffer — sprawdzamy jawnie, zamiast rzutować na ślepo.
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Nieoczekiwany format logo.'));
      };
      reader.onerror = () => reject(new Error('Nie udało się odczytać logo.'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // Brak logo nie może zablokować eksportu — dokument wydrukuje się z samą
    // nazwą firmy w nagłówku.
    log.warn('Nie udało się wczytać logo do PDF', error);
    return null;
  }
}

function downloadInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
