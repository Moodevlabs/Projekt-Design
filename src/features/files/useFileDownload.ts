import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { downloadFile } from '@/data/repos/files.repo';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import type { StoredFile } from '@/domain/files/schema';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('files.download');

/**
 * Pobranie pliku na dysk.
 *
 * W Tauri: dialog zapisu → `save_file` → toast z „Otwórz", dokładnie jak przy
 * eksporcie PDF. W przeglądarce (`pnpm dev`) zwykły `<a download>`.
 *
 * Bajty ciągniemy przez `download()` z klienta Supabase, a nie przez otwarcie
 * podpisanego URL-a w przeglądarce systemowej: chcemy plik **u siebie**, pod
 * nazwą z kolumny `name`, a nie losowy klucz obiektu w folderze Pobrane.
 */
export function useFileDownload() {
  const [busy, setBusy] = useState(false);

  const download = useCallback(async (file: StoredFile) => {
    setBusy(true);
    try {
      const bytes = await downloadFile(file.storagePath);

      if (!runningInTauri()) {
        downloadInBrowser(bytes, file.name, file.mime);
        return;
      }

      const { save } = await import('@tauri-apps/plugin-dialog');
      const target = await save({ defaultPath: file.name });
      // `null` = użytkownik zamknął dialog. To nie jest błąd.
      if (!target) return;

      const savedPath = await saveFile(target, bytes);
      toast.success(pl.files.downloaded, {
        action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
      });
    } catch (error) {
      log.error('Pobranie pliku nieudane', { id: file.id, error });
      toast.error(error instanceof Error ? error.message : pl.files.downloadFailed);
    } finally {
      setBusy(false);
    }
  }, []);

  return { download, busy };
}

function downloadInBrowser(bytes: Uint8Array, fileName: string, mime: string) {
  const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
