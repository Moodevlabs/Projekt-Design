import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit } from '@/domain/brand/schema';
import type { ScheduleBody } from '@/domain/schedule';
import type { Room } from '@/domain/quote';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { scheduleFileName } from './file-name';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.schedule');

export interface ExportScheduleArgs {
  schedule: ScheduleBody | null;
  rooms: Room[];
  number: string | null;
  issueDate: string;
  /** Ważność dokumentu terminu — osobna od ważności oferty (F5.3). */
  validDays?: number;
}

/**
 * Eksport dokumentu „Szacowany termin" (F5.3).
 *
 * Ważność jest **osobna od oferty i krótsza**: termin starzeje się szybciej niż
 * cena — zależy od tego, kiedy projekt ruszy, a nie od cennika.
 */
export function useExportSchedulePdf() {
  const brandKit = useBrandKit();
  const [exporting, setExporting] = useState(false);

  const exportSchedule = useCallback(
    async ({ schedule, rooms, number, issueDate, validDays = 7 }: ExportScheduleArgs) => {
      if (!schedule) {
        // Bez harmonogramu nie ma czego drukowac — mowimy, gdzie go ustawic,
        // zamiast wypuszczac pusty dokument.
        toast.info(pl.pdf.scheduleMissing);
        return;
      }

      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const [{ pdf }, { SchedulePdfDocument }] = await Promise.all([
          import('@react-pdf/renderer'),
          import('./SchedulePdfDocument'),
        ]);

        const blob = await pdf(
          <SchedulePdfDocument
            schedule={schedule}
            rooms={rooms}
            theme={theme}
            brandKit={kit}
            number={number}
            issueDate={issueDate}
            validDays={validDays}
            logoDataUrl={logoDataUrl}
          />,
        ).toBlob();

        const bytes = new Uint8Array(await blob.arrayBuffer());
        const fileName = scheduleFileName(number);

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
        toast.success(pl.pdf.scheduleSaved, {
          action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
        });
      } catch (error) {
        log.error('Eksport terminu nieudany', error);
        toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed);
      } finally {
        setExporting(false);
      }
    },
    [brandKit.data],
  );

  return { exportSchedule, exporting };
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
