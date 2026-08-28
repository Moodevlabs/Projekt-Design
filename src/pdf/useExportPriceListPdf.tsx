import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { defaultBrandKit } from '@/domain/brand/schema';
import { priceListHasContent, type PriceListDoc } from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { priceListFileName } from './file-name';
import { deliverPdf, type ArchiveRequest } from './export';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.priceList');

export interface ExportPriceListArgs {
  /** Kopia do archiwum klienta (T-56). `null`/pominiete = nie archiwizuj. */
  archive?: ArchiveRequest | null;
  /** Numer wersji — do nazwy pliku, zeby wersje sie nie nadpisywaly (T-57). */
  version?: number;
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
    async ({ doc, number, issueDate, currency = 'PLN', archive, version }: ExportPriceListArgs) => {
      if (!priceListHasContent(doc) || !doc) {
        // Pusta powloka zakladki to nie cennik (T-115).
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
        const fileName = priceListFileName(number, version);

        await deliverPdf({
          bytes,
          fileName,
          docType: 'price_list',
          savedToast: pl.pdf.priceListSaved,
          archive: archive ?? null,
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
