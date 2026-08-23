import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { StagesDoc } from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { stagesFileName } from './file-name';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.stages');

export interface ExportStagesArgs {
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
    async ({ doc, number, issueDate }: ExportStagesArgs) => {
      if (!doc) {
        // Nie wypuszczamy pustego dokumentu — mowimy, gdzie go zlozyc.
        toast.info(pl.pdf.stagesMissing);
        return;
      }

      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const [{ pdf }, { StagesPdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./StagesPdfDocument'),
        ]);

        const blob = await pdf(
          <StagesPdfDocument
            doc={doc}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            logoDataUrl={logoDataUrl}
          />,
        ).toBlob();

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fileName = stagesFileName(number);

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
        toast.success(pl.pdf.stagesSaved, {
          action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
        });
      } catch (error) {
        log.error('Eksport etapow nieudany', error);
        toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed);
      } finally {
        setExporting(false);
      }
    },
    [brandKit.data],
  );

  return { exportStages, exporting };
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
