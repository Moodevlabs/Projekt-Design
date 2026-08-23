import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { PriceListDoc } from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { priceListFileName } from './file-name';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.priceList');

export interface ExportPriceListArgs {
  doc: PriceListDoc | null;
  number: string | null;
  issueDate: string;
  currency?: string;
}

/** Eksport dokumentu „Cennik usług dodatkowych" (F6.2). */
export function useExportPriceListPdf() {
  const brandKit = useBrandKit();
  const [exporting, setExporting] = useState(false);

  const exportPriceList = useCallback(
    async ({ doc, number, issueDate, currency = 'PLN' }: ExportPriceListArgs) => {
      if (!doc) {
        toast.info(pl.pdf.priceListMissing);
        return;
      }

      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const [{ pdf }, { PriceListPdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./PriceListPdfDocument'),
        ]);

        const blob = await pdf(
          <PriceListPdfDocument
            doc={doc}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            currency={currency}
            logoDataUrl={logoDataUrl}
          />,
        ).toBlob();

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fileName = priceListFileName(number);

        if (!runningInTauri()) {
          downloadInBrowser(bytes, fileName);
          return;
        }

        const { save } = await import('@tauri-apps/plugin-dialog');
        const target = await save({
          defaultPath: fileName,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });
        if (!target) return;

        const savedPath = await saveFile(target, bytes);
        toast.success(pl.pdf.priceListSaved, {
          action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
        });
      } catch (error) {
        log.error('Eksport cennika nieudany', error);
        toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed);
      } finally {
        setExporting(false);
      }
    },
    [brandKit.data],
  );

  return { exportPriceList, exporting };
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
