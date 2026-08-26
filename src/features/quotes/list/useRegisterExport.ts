import { toast } from 'sonner';
import { useQuoteRegisterExport, type QuoteListFilters } from '@/data/queries/useQuotes';
import { openPath, runningInTauri, saveFile } from '@/lib/tauri';
import { registerCsv, registerFileName, registerXlsx } from './register-csv';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('register.export');

export type ExportFormat = 'csv' | 'xlsx';

const MIME: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Eksport rejestru ofert do CSV (F7.1).
 *
 * Eksportujemy **to, co widać po filtrach** — a nie zawsze wszystko. Kto
 * odfiltrował wyceny wysłane, ten chce dostać wysłane; plik zawierający coś
 * innego niż lista na ekranie jest gorszy niż brak eksportu.
 */
export function useRegisterExport() {
  const pobierz = useQuoteRegisterExport();

  const exportRegister = async (filters: QuoteListFilters, format: ExportFormat = 'csv') => {
    try {
      const rows = await pobierz.mutateAsync(filters);
      if (rows.length === 0) {
        toast.info(pl.quotes.registerEmpty);
        return;
      }

      const fileName = registerFileName(new Date().toISOString(), format);
      // CSV: `TextEncoder`, bo BOM i polskie znaki musza wyjsc jako UTF-8
      // bajtowo — `String` oddany do zapisu bez kodowania trafilby w systemowa
      // strone kodowa i cala robota z BOM-em bylaby na nic.
      // XLSX jest juz bajtami.
      const bytes =
        format === 'xlsx' ? registerXlsx(rows) : new TextEncoder().encode(registerCsv(rows));

      if (!runningInTauri()) {
        downloadInBrowser(bytes, fileName, MIME[format]);
        toast.success(pl.quotes.registerExported(rows.length));
        return;
      }

      const { save } = await import('@tauri-apps/plugin-dialog');
      const target = await save({
        defaultPath: fileName,
        filters: [
          format === 'xlsx'
            ? { name: 'Excel', extensions: ['xlsx'] }
            : { name: 'CSV', extensions: ['csv'] },
        ],
      });
      if (!target) return;

      const savedPath = await saveFile(target, bytes);
      toast.success(pl.quotes.registerExported(rows.length), {
        action: { label: pl.editor.pdfOpen, onClick: () => void openPath(savedPath) },
      });
    } catch (error) {
      log.error('Eksport rejestru nieudany', error);
      toast.error(error instanceof Error ? error.message : pl.quotes.loadError);
    }
  };

  return { exportRegister, exporting: pobierz.isPending };
}

function downloadInBrowser(bytes: Uint8Array, fileName: string, mime: string) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
