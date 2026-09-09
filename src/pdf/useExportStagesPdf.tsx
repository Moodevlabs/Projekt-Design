import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { defaultBrandKit } from '@/domain/brand/schema';
import { stagesHasContent, type StagesDoc } from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { pickHeaderLogoPath } from '@/domain/brand/logo-pick';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { stagesFileName } from './file-name';
import { deliverPdf, type ArchiveRequest } from './export';
import { runPdfExport } from './export-run';
import { renderElementToBytes } from './render';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.stages');

export interface ExportStagesArgs {
  /** Kopia do archiwum klienta (T-56). `null`/pominiete = nie archiwizuj. */
  archive?: ArchiveRequest | null;
  /** Numer wersji — do nazwy pliku, zeby wersje sie nie nadpisywaly (T-57). */
  version?: number;
  doc: StagesDoc | null;
  number: string | null;
  issueDate: string;
}

/**
 * Eksport dokumentu „Etapy współpracy" (F6.1).
 *
 * Ważność bierzemy z samego dokumentu (`doc.validDays`), a nie z argumentu jak
 * przy terminie: etapy są zakresem umowy, więc to użytkownik decyduje w
 * zakładce, jak długo ta deklaracja obowiązuje.
 */
export function useExportStagesPdf() {
  const brandKit = useBrandKit();
  const [exporting, setExporting] = useState(false);

  const exportStages = useCallback(
    async ({ doc, number, issueDate, archive, version }: ExportStagesArgs) => {
      if (!stagesHasContent(doc) || !doc) {
        // Nie wypuszczamy pustego dokumentu (takze pustej powloki zakladki,
        // T-115) — mowimy, gdzie go zlozyc.
        toast.info(pl.pdf.stagesMissing);
        return;
      }

      setExporting(true);
      await runPdfExport(log, 'Eksport etapow nieudany', async () => {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = pickHeaderLogoPath(kit, theme.headerLogo);
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const { StagesPdfDocument } = await import('./StagesPdfDocument');
        const bytes = await renderElementToBytes(
          <StagesPdfDocument
            doc={doc}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            logoDataUrl={logoDataUrl}
          />,
        );

        await deliverPdf({
          bytes,
          fileName: stagesFileName(number, version),
          docType: 'stages',
          savedToast: pl.pdf.stagesSaved,
          archive: archive ?? null,
        });
      });
      setExporting(false);
    },
    [brandKit.data],
  );

  return { exportStages, exporting };
}
