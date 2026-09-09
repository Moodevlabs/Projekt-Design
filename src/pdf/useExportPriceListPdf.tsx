import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { defaultBrandKit } from '@/domain/brand/schema';
import { priceListHasContent, type PriceListDoc } from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { pickHeaderLogoPath } from '@/domain/brand/logo-pick';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { priceListFileName } from './file-name';
import { deliverPdf, type ArchiveRequest } from './export';
import { runPdfExport } from './export-run';
import { renderElementToBytes } from './render';
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
      await runPdfExport(log, 'Eksport cennika nieudany', async () => {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = pickHeaderLogoPath(kit, theme.headerLogo);
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const { PriceListPdfDocument } = await import('./PriceListPdfDocument');
        const bytes = await renderElementToBytes(
          <PriceListPdfDocument
            doc={doc}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            currency={currency}
            logoDataUrl={logoDataUrl}
          />,
        );

        await deliverPdf({
          bytes,
          fileName: priceListFileName(number, version),
          docType: 'price_list',
          savedToast: pl.pdf.priceListSaved,
          archive: archive ?? null,
        });
      });
      setExporting(false);
    },
    [brandKit.data],
  );

  return { exportPriceList, exporting };
}
