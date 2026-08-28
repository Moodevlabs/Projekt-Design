import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useBrandKit } from '@/data/queries/useBrandKit';
import { joinPath, openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { defaultBrandKit, type BrandKit } from '@/domain/brand/schema';
import type { QuoteBody, Room } from '@/domain/quote';
import { scheduleHasContent, type ScheduleBody } from '@/domain/schedule';
import {
  priceListHasContent,
  stagesHasContent,
  type PriceListDoc,
  type StagesDoc,
} from '@/domain/documents';
import { createLogger } from '@/lib/logger';
import { fetchLogoAsDataUrl } from './logo';
import { renderQuotePdf } from './render';
import { buildPdfTheme, type PdfTheme } from './theme';
import { isPdfFontRegistered, registerPdfFonts } from './fonts/register';
import { mergePdfs } from './merge';
import { packageFileName, packagePlan, type PackageDocKind } from './package-plan';
import { archiveExportedPdf, deliverPdf, type ArchiveRequest } from './export';
import type { DocType } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.package');

export interface PackageSource {
  body: QuoteBody;
  rooms: Room[];
  schedule: ScheduleBody | null;
  stages: StagesDoc | null;
  priceList: PriceListDoc | null;
  number: string | null;
  issueDate: string;
  currency: string;
}

export interface ExportPackageArgs extends PackageSource {
  selected: readonly PackageDocKind[];
  /** `true` = jeden scalony plik, `false` = osobne pliki do wybranego folderu. */
  single: boolean;
  /** Ważność terminu — osobna od oferty (F5.3), stała 7 dni jak w eksporcie pojedynczym. */
  scheduleValidDays?: number;
  /** Kopia do archiwum klienta (T-56). `null`/pominiete = nie archiwizuj. */
  archive?: ArchiveRequest | null;
}

/**
 * Rodzaj dokumentu w archiwum.
 *
 * `priceList` w planie pakietu i `price_list` w bazie to ta sama rzecz zapisana
 * dwiema konwencjami — mapowanie trzymamy w jednym miejscu, zamiast liczyć na
 * to, że nikt nie pomyli camelCase ze snake_case.
 */
const DOC_TYPE: Record<PackageDocKind, DocType> = {
  quote: 'quote',
  schedule: 'schedule',
  stages: 'stages',
  priceList: 'price_list',
};

/**
 * Eksport pakietu dokumentów (F6.3).
 *
 * Dokumenty renderujemy **równolegle** (`Promise.all`): każdy jest niezależnym
 * `@react-pdf`-em, a szeregowanie ich tylko dlatego, że kod czyta się liniowo,
 * kosztowałoby sekundy na pakiecie czterech plików.
 */
export function usePackageExport() {
  const brandKit = useBrandKit();
  const [exporting, setExporting] = useState(false);

  const exportPackage = useCallback(
    async ({ selected, single, scheduleValidDays = 7, archive, ...source }: ExportPackageArgs) => {
      const plan = packagePlan(
        selected,
        {
          // Po treści, nie po istnieniu (T-115) — jak w dialogu pakietu.
          hasSchedule: scheduleHasContent(source.schedule),
          hasStages: stagesHasContent(source.stages),
          hasPriceList: priceListHasContent(source.priceList),
        },
        source.number,
        source.body.client.name,
      );

      if (plan.length === 0) {
        toast.info(pl.pdf.packageNothingSelected);
        return;
      }

      setExporting(true);
      try {
        const kit = brandKit.data ?? defaultBrandKit();
        registerPdfFonts();
        const theme = buildPdfTheme(kit, isPdfFontRegistered(kit.fontFamily));
        const logoPath = theme.headerLogo === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
        const logoDataUrl = await fetchLogoAsDataUrl(logoPath);

        const czesci = await Promise.all(
          plan.map(async (part) => ({
            kind: part.kind,
            fileName: part.fileName,
            bytes: await renderPart(part.kind, {
              ...source,
              scheduleValidDays,
              theme,
              brandKit: kit,
              logoDataUrl,
            }),
          })),
        );

        if (single) {
          const scalony = await mergePdfs(
            czesci.map((part) => part.bytes),
            { pageLabel: pl.pdf.packagePageLabel },
          );
          // Scalony pakiet to JEDEN wpis w archiwum — bo jeden plik poszedl
          // do inwestora (koncepcja §3 regula 6).
          await deliverPdf({
            bytes: scalony,
            fileName: packageFileName(source.number),
            docType: 'package',
            savedToast: pl.pdf.packageSaved,
            archive: archive ?? null,
          });
          return;
        }

        // Osobne pliki = osobne wpisy, kazdy ze swoim typem. Zapis na dysk
        // idzie tu przez dialog FOLDERU, wiec nie da sie go przepuscic przez
        // `deliverPdf` — ale archiwizacja jest ta sama funkcja.
        if (archive) {
          for (const part of czesci) {
            await archiveExportedPdf({
              archive,
              docType: DOC_TYPE[part.kind],
              fileName: part.fileName,
              bytes: part.bytes,
            });
          }
        }

        await saveMany(czesci);
      } catch (error) {
        log.error('Eksport pakietu nieudany', error);
        toast.error(error instanceof Error ? error.message : pl.editor.pdfFailed);
      } finally {
        setExporting(false);
      }
    },
    [brandKit.data],
  );

  return { exportPackage, exporting };
}

interface RenderContext extends PackageSource {
  scheduleValidDays: number;
  theme: PdfTheme;
  brandKit: BrandKit;
  logoDataUrl: string | null;
}

async function renderPart(kind: PackageDocKind, ctx: RenderContext): Promise<Uint8Array> {
  const wspolne = {
    theme: ctx.theme,
    brandKit: ctx.brandKit,
    number: ctx.number,
    issueDate: ctx.issueDate,
    logoDataUrl: ctx.logoDataUrl,
  };

  if (kind === 'quote') {
    return renderQuotePdf({
      body: ctx.body,
      currency: ctx.currency,
      ...wspolne,
    });
  }

  const { pdf } = await import('@react-pdf/renderer');

  if (kind === 'schedule') {
    const { SchedulePdfDocument } = await import('./SchedulePdfDocument');
    // `packagePlan` przepuscil ten dokument tylko dlatego, ze istnieje.
    if (!ctx.schedule) throw new Error('Brak harmonogramu');
    return toBytes(
      pdf(
        <SchedulePdfDocument
          schedule={ctx.schedule}
          rooms={ctx.rooms}
          validDays={ctx.scheduleValidDays}
          {...wspolne}
        />,
      ).toBlob(),
    );
  }

  if (kind === 'stages') {
    const { StagesPdfDocument } = await import('./StagesPdfDocument');
    if (!ctx.stages) throw new Error('Brak dokumentu etapow');
    return toBytes(pdf(<StagesPdfDocument doc={ctx.stages} {...wspolne} />).toBlob());
  }

  const { PriceListPdfDocument } = await import('./PriceListPdfDocument');
  if (!ctx.priceList) throw new Error('Brak cennika');
  return toBytes(
    pdf(<PriceListPdfDocument doc={ctx.priceList} currency={ctx.currency} {...wspolne} />).toBlob(),
  );
}

async function toBytes(blob: Promise<Blob>): Promise<Uint8Array> {
  return new Uint8Array(await (await blob).arrayBuffer());
}

/**
 * Osobne pliki — pytamy o **folder**, nie o każdą nazwę z osobna.
 *
 * Cztery dialogi zapisu pod rząd to nie wybór, tylko przeszkoda; nazwy plików
 * i tak są ustalone przez numer wyceny.
 */
async function saveMany(parts: { fileName: string; bytes: Uint8Array }[]) {
  if (!runningInTauri()) {
    for (const part of parts) downloadInBrowser(part.bytes, part.fileName);
    return;
  }

  const { open } = await import('@tauri-apps/plugin-dialog');
  const folder = await open({ directory: true, multiple: false });
  if (typeof folder !== 'string') return;

  for (const part of parts) {
    await saveFile(await joinPath(folder, part.fileName), part.bytes);
  }

  toast.success(pl.pdf.packageSavedMany(parts.length), {
    action: { label: pl.editor.pdfOpen, onClick: () => void openPath(folder) },
  });
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
