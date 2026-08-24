import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useUploadFile } from '@/data/queries/useFiles';
import { rejectionFor, type RejectionReason } from '@/domain/files/schema';
import {
  fileNameFromPath,
  onFilesDropped,
  openFilesDialog,
  readFile,
  runningInTauri,
} from '@/lib/tauri';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('files.upload');

/** Plik gotowy do wysyłki — wspólny kształt dla obu dróg wejścia. */
interface Candidate {
  name: string;
  mime: string;
  bytes: Uint8Array;
}

function rejectionMessage(name: string, reason: RejectionReason): string {
  if (reason === 'too_large') return pl.files.rejectedTooLarge(name);
  if (reason === 'blocked_extension') return pl.files.rejectedExtension(name);
  return pl.files.rejectedEmpty(name);
}

/**
 * Wysyłka plików do archiwum klienta/projektu.
 *
 * **Dwie drogi wejścia za jednym adapterem** (§9.12):
 * - Tauri: `dialog.open` i `onDragDropEvent` dają **ścieżki**, bajty czyta
 *   komenda Rusta. Webview nie dostaje tu zdarzeń HTML5 drop dla plików.
 * - Przeglądarka (`pnpm dev`): `<input type=file>` i `dataTransfer.files`
 *   dają obiekty `File`; ścieżek nie ma i mieć nie będzie.
 *
 * Odsiew (rozmiar, rozszerzenie, pusty plik) leci **przed** wysyłką i po
 * polsku — Storage odrzuci to samo, ale po angielsku i bez nazwy pliku
 * (pułapka z T-12).
 */
export function useFileUpload(target: { clientId: string; projectId?: string | null }) {
  const upload = useUploadFile();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const send = useCallback(
    async (candidates: Candidate[]) => {
      if (candidates.length === 0) return;

      const accepted: Candidate[] = [];
      for (const candidate of candidates) {
        const reason = rejectionFor({ name: candidate.name, size: candidate.bytes.byteLength });
        if (reason) toast.error(rejectionMessage(candidate.name, reason));
        else accepted.push(candidate);
      }
      if (accepted.length === 0) return;

      setProgress({ done: 0, total: accepted.length });
      let sent = 0;

      // Po kolei, nie równolegle: limit miejsca sprawdza trigger przy każdym
      // wierszu, a przy równoległych wysyłkach dwa pliki policzyłyby ten sam
      // stan. Poza tym seria dużych plików naraz zapycha łącze.
      for (const candidate of accepted) {
        try {
          await upload.mutateAsync({
            clientId: target.clientId,
            projectId: target.projectId ?? null,
            name: candidate.name,
            mime: candidate.mime,
            bytes: candidate.bytes,
          });
          sent += 1;
          setProgress({ done: sent, total: accepted.length });
        } catch (error) {
          log.error('Wysylka pliku nieudana', { name: candidate.name, error });
          toast.error(error instanceof Error ? error.message : pl.files.uploadFailed);
          // Przerywamy serię: najczęstszy powód to wyczerpany limit,
          // a wtedy kolejne pliki odbiją się dokładnie tak samo.
          break;
        }
      }

      setProgress(null);
      if (sent > 0) toast.success(pl.files.uploaded(sent));
    },
    [upload, target.clientId, target.projectId],
  );

  /** Droga przeglądarki: obiekty `File` z inputa albo z `dataTransfer`. */
  const sendBrowserFiles = useCallback(
    async (files: FileList | File[]) => {
      const candidates: Candidate[] = [];
      for (const file of Array.from(files)) {
        candidates.push({
          name: file.name,
          mime: file.type,
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
      }
      await send(candidates);
    },
    [send],
  );

  /** Droga Tauri: ścieżki z dialogu albo z upuszczenia na okno. */
  const sendPaths = useCallback(
    async (paths: string[]) => {
      const candidates: Candidate[] = [];
      for (const path of paths) {
        try {
          candidates.push({
            name: fileNameFromPath(path),
            // MIME z systemu nie przychodzi razem ze ścieżką; ustala go
            // Storage z zawartości, a my i tak filtrujemy po rozszerzeniu.
            mime: '',
            bytes: await readFile(path),
          });
        } catch (error) {
          log.error('Nie udalo sie odczytac pliku z dysku', { path, error });
          toast.error(`${fileNameFromPath(path)}: ${pl.files.uploadFailed}`);
        }
      }
      await send(candidates);
    },
    [send],
  );

  /** „Dodaj pliki" — dialog systemowy w Tauri, `<input>` w przeglądarce. */
  const pickFiles = useCallback(async () => {
    if (!runningInTauri()) return false;
    const paths = await openFilesDialog();
    await sendPaths(paths);
    return true;
  }, [sendPaths]);

  // Upuszczenie na okno w Tauri. W przeglądarce strefa drop obsługuje się
  // sama zdarzeniami HTML5 — tam ten nasłuch nie ma czego słuchać.
  useEffect(() => {
    if (!runningInTauri()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void onFilesDropped(
      (paths) => void sendPaths(paths),
      (hovering) => setDragging(hovering),
    ).then((stop) => {
      if (cancelled) stop();
      else unlisten = stop;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [sendPaths]);

  return {
    pickFiles,
    sendBrowserFiles,
    progress,
    dragging,
    setDragging,
    busy: progress !== null,
  };
}
