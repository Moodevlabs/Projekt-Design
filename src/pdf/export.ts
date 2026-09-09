import { toast } from 'sonner';
import { archiveGeneratedPdf, type ArchiveTarget } from '@/data/repos/files.repo';
import type { DocType } from '@/domain/files/schema';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';
import { withTimeout } from '@/lib/with-timeout';
import { PDF_PROGRESS_TOAST } from './export-run';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.deliver');

/**
 * Limity czasu kroków, które idą przez sieć albo IPC (2026-09-09).
 *
 * Archiwizacja to upload do Storage i `insert` — przy dobrym łączu sekundy.
 * Zapis na dysk to jedno wywołanie Rusta; minuta to już nie „duży plik",
 * tylko zawieszony most. Bez limitów każdy z tych kroków potrafił nie
 * odpowiedzieć nigdy i eksport nie kończył się ani sukcesem, ani błędem.
 */
const ARCHIVE_TIMEOUT_MS = 60_000;
const SAVE_TIMEOUT_MS = 60_000;

/** Gdzie ma trafić kopia dokumentu. `null` = nie archiwizuj. */
export interface ArchiveRequest extends ArchiveTarget {
  workspaceId: string;
}

export interface DeliverPdfArgs {
  bytes: Uint8Array;
  fileName: string;
  docType: DocType;
  /** Komunikat po udanym zapisie na dysk — każdy dokument ma swój. */
  savedToast: string;
  /** `null`, gdy wycena nie ma klienta albo użytkownik odznaczył archiwizację. */
  archive: ArchiveRequest | null;
}

/**
 * Jedno wyjście dla **wszystkich** eksportów PDF (§9.9).
 *
 * Eksportów jest pięć (wycena, termin, etapy, cennik, pakiet) i każdy robił
 * to samo na własną rękę: dialog zapisu, `save_file`, toast. Archiwizacja
 * dopisana w pięciu miejscach rozjechałaby się przy pierwszej zmianie — stąd
 * jedno miejsce, przez które przechodzi gotowy dokument.
 *
 * **Archiwizacja jest niezależna od zapisu na dysk** (koncepcja §3 reguła 6):
 * rusza PIERWSZA, więc zamknięcie dialogu zapisu jej nie cofa, a jej
 * niepowodzenie nie blokuje pliku na dysku — dostajesz toast z „Ponów".
 * Te dwie rzeczy odpowiadają na różne pytania: „czy mam plik u siebie" i „czy
 * wiem, co wysłałem klientowi".
 *
 * Rusza pierwsza, ale **nie blokuje dialogu** (2026-09-09): do tej pory
 * dialog zapisu czekał, aż upload się skończy, a gdy Supabase nie
 * odpowiadało, nie pojawiał się wcale — i to był ten „eksport, który nic
 * nie robi". Teraz upload leci w tle, dialog otwiera się od razu, a na wynik
 * archiwizacji czekamy dopiero na końcu.
 *
 * Zwraca `saved: true` tylko wtedy, gdy plik NAPRAWDĘ trafił na dysk —
 * pytanie „oznaczyć jako wysłaną?" nie ma prawa paść po anulowanym dialogu.
 */
export async function deliverPdf({
  bytes,
  fileName,
  docType,
  savedToast,
  archive,
}: DeliverPdfArgs): Promise<{ saved: boolean }> {
  // `archiveExportedPdf` nigdy nie rzuca — obsługuje własne toasty.
  const archiving = archive
    ? archiveExportedPdf({ archive, docType, fileName, bytes })
    : Promise.resolve();

  try {
    return await saveToDisk(bytes, fileName, savedToast);
  } finally {
    await archiving;
  }
}

async function saveToDisk(
  bytes: Uint8Array,
  fileName: string,
  savedToast: string,
): Promise<{ saved: boolean }> {
  if (!runningInTauri()) {
    // W przeglądarce (`pnpm dev`) nie ma dialogu systemowego — pobieramy plik
    // po staremu, żeby dało się sprawdzić wynik bez budowania aplikacji.
    downloadInBrowser(bytes, fileName);
    return { saved: true };
  }

  const { save } = await import('@tauri-apps/plugin-dialog');
  // Dokument jest gotowy — od tej chwili czeka człowiek, nie program.
  toast.dismiss(PDF_PROGRESS_TOAST);
  const target = await save({
    defaultPath: fileName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  // `null` znaczy, że użytkownik zamknął dialog — to nie jest błąd.
  if (!target) return { saved: false };

  const savedPath = await withTimeout(
    saveFile(target, bytes),
    SAVE_TIMEOUT_MS,
    pl.pdf.saveTimedOut,
  );
  toast.success(savedToast, {
    action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
  });
  return { saved: true };
}

export interface ArchiveArgs {
  archive: ArchiveRequest;
  docType: DocType;
  fileName: string;
  bytes: Uint8Array;
}

/**
 * Archiwizacja z toastem „Ponów".
 *
 * Nie rzucamy dalej: nieudany zapis do archiwum nie ma prawa przerwać
 * eksportu, bo najważniejsze jest to, że człowiek dostaje plik. Ponowienie
 * jest jednym kliknięciem, a nie powtarzaniem całego renderu.
 */
export async function archiveExportedPdf({
  archive,
  docType,
  fileName,
  bytes,
}: ArchiveArgs): Promise<void> {
  try {
    await withTimeout(
      archiveGeneratedPdf({ ...archive, docType, fileName, bytes }),
      ARCHIVE_TIMEOUT_MS,
      pl.documents.archiveTimedOut,
    );
    toast.success(pl.documents.archived);
  } catch (error) {
    log.error('Archiwizacja dokumentu nieudana', { fileName, error });
    toast.error(error instanceof Error ? error.message : pl.documents.archiveFailed, {
      action: {
        label: pl.common.retry,
        onClick: () => void archiveExportedPdf({ archive, docType, fileName, bytes }),
      },
    });
  }
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
