import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { downloadFile } from '@/data/repos/files.repo';
import { openBytes, runningInTauri } from '@/lib/tauri';
import type { StoredFile } from '@/domain/files/schema';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('files.open');

/**
 * Otwarcie pliku do OBEJRZENIA (poprawka z 2026-08-28).
 *
 * ## Czym się różni od „Pobierz"
 *
 * `useFileDownload` odpowiada na pytanie „chcę mieć ten plik u siebie" i dlatego
 * słusznie pyta dialogiem, gdzie go położyć. „Otwórz" odpowiada na zupełnie
 * inne: „chcę zobaczyć, co wysłałem klientowi". Do tej pory oba szły tą samą
 * drogą, więc kliknięcie „Otwórz" pokazywało systemowy dialog zapisu i nigdy
 * niczego nie otwierało — trzeba było najpierw wskazać katalog, a dopiero
 * potem złapać przycisk w toaście.
 *
 * Teraz plik ląduje w katalogu podręcznym aplikacji i od razu trafia do
 * systemowej przeglądarki PDF. Bez pytań, bo żadne nie jest tu potrzebne.
 *
 * W przeglądarce (`pnpm dev`) otwieramy nową kartę na adresie blobu — Tauri
 * z jego katalogami tam nie ma, a karta robi dokładnie to samo.
 */
export function useFileOpen() {
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (file: StoredFile) => {
    setBusy(true);
    try {
      const bytes = await downloadFile(file.storagePath);

      if (!runningInTauri()) {
        openInBrowserTab(bytes, file.mime);
        return;
      }

      await openBytes(file.name, bytes);
    } catch (error) {
      log.error('Otwarcie pliku nieudane', { id: file.id, error });
      toast.error(error instanceof Error ? error.message : pl.files.openFailed);
    } finally {
      setBusy(false);
    }
  }, []);

  return { open, busy };
}

function openInBrowserTab(bytes: Uint8Array, mime: string) {
  const blob = new Blob([bytes], { type: mime || 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  // Adresu nie zwalniamy od razu: nowa karta dopiero go czyta, a `revoke`
  // w tej samej klatce zostawiłby ją pustą. Minuta wystarczy na wczytanie,
  // a potem pamięć wraca.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
