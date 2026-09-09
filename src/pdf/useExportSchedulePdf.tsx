import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { defaultBrandKit } from '@/domain/brand/schema';
import { scheduleHasContent, type ScheduleBody } from '@/domain/schedule';
import type { Room } from '@/domain/quote';
import { createLogger } from '@/lib/logger';
import { pickHeaderLogoPath } from '@/domain/brand/logo-pick';
import { fetchLogoAsDataUrl } from './logo';
import { buildPdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { scheduleFileName } from './file-name';
import { deliverPdf, type ArchiveRequest } from './export';
import { runPdfExport } from './export-run';
import { renderElementToBytes } from './render';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.schedule');

export interface ExportScheduleArgs {
  /** Kopia do archiwum klienta (T-56). `null`/pominiete = nie archiwizuj. */
  archive?: ArchiveRequest | null;
  /** Numer wersji — do nazwy pliku, zeby wersje sie nie nadpisywaly (T-57). */
  version?: number;
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
    async ({
      schedule,
      rooms,
      number,
      issueDate,
      validDays = 7,
      archive,
      version,
    }: ExportScheduleArgs) => {
      if (!scheduleHasContent(schedule) || !schedule) {
        // Bez harmonogramu (albo z pusta powloka zakladki — T-115) nie ma
        // czego drukowac — mowimy, gdzie go ustawic, zamiast wypuszczac
        // pusty dokument.
        toast.info(pl.pdf.scheduleMissing);
        return;
      }

      setExporting(true);
      await runPdfExport(log, 'Eksport terminu nieudany', async () => {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));

        const logoPath = pickHeaderLogoPath(kit, theme.headerLogo);
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const { SchedulePdfDocument } = await import('./SchedulePdfDocument');
        const bytes = await renderElementToBytes(
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
        );

        await deliverPdf({
          bytes,
          fileName: scheduleFileName(number, version),
          docType: 'schedule',
          savedToast: pl.pdf.scheduleSaved,
          archive: archive ?? null,
        });
      });
      setExporting(false);
    },
    [brandKit.data],
  );

  return { exportSchedule, exporting };
}
