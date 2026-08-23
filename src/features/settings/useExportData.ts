import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { exportFileName, exportWorkspaceData } from '@/data/repos/export.repo';
import { requireWorkspaceId, useWorkspaceId } from '@/data/queries/useWorkspace';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('settings.export');

/**
 * Eksport danych do pliku JSON.
 *
 * Zrzut **nie wymaga aktywnego dostępu** — i to jest celowe. Człowiek, któremu
 * skończyła się subskrypcja, ma prawo wyjąć swoją pracę; blokowanie eksportu
 * zamieniłoby płatność w trzymanie danych jako zakładnika. To odczyt, więc
 * RLS też go przepuszcza.
 */
export function useExportData() {
  const workspaceId = useWorkspaceId();
  const [exporting, setExporting] = useState(false);

  const exportData = useCallback(async () => {
    setExporting(true);
    try {
      const dump = await exportWorkspaceData(requireWorkspaceId(workspaceId));
      // `null, 2` — plik ma być czytelny dla człowieka, nie tylko dla parsera.
      const json = JSON.stringify(dump, null, 2);
      const fileName = exportFileName();

      if (!runningInTauri()) {
        downloadInBrowser(json, fileName);
        return;
      }

      const { save } = await import('@tauri-apps/plugin-dialog');
      const target = await save({
        defaultPath: fileName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      // `null` znaczy, że dialog zamknięto — to nie jest błąd.
      if (!target) return;

      const savedPath = await saveFile(target, new TextEncoder().encode(json));
      toast.success(pl.settings.exportDone, {
        action: { label: pl.settings.exportOpen, onClick: () => void openPath(savedPath) },
      });
    } catch (error) {
      log.error('Eksport danych nieudany', error);
      toast.error(error instanceof Error ? error.message : pl.settings.exportFailed);
    } finally {
      setExporting(false);
    }
  }, [workspaceId]);

  return { exportData, exporting };
}

/** W `pnpm dev` nie ma dialogu systemowego — pobieramy plik przeglądarką. */
function downloadInBrowser(json: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
