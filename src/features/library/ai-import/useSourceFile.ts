import { useCallback, useEffect, useState } from 'react';

import type { AiFileSource } from '@/domain/ai';
import {
  fileToAiSource,
  isAiFileSourceError,
  type AiFileSourceErrorCode,
} from '@/lib/ai-file-source';
import { createLogger } from '@/lib/logger';
import {
  fileNameFromPath,
  onFilesDropped,
  openFilesDialog,
  readFile,
  runningInTauri,
} from '@/lib/tauri';

const log = createLogger('library.ai-import');

export interface SourceFileError {
  code: AiFileSourceErrorCode | 'read_failed';
  ext: string;
  /** Przy `too_long`: ile znaków ma tekst. */
  chars?: number;
}

/**
 * Wczytanie JEDNEGO pliku do importu — za tym samym adapterem co wysyłka
 * plików (`useFileUpload`): w Tauri ścieżki z dialogu systemowego albo
 * z upuszczenia na okno, w przeglądarce obiekty `File`.
 *
 * `active` włącza nasłuch upuszczenia tylko, gdy dialog jest otwarty — poza
 * nim upuszczony plik ma trafić tam, gdzie użytkownik patrzy, a nie do
 * zamkniętego importu.
 */
export function useSourceFile(
  active: boolean,
  onSource: (source: AiFileSource, fileName: string) => void,
) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<SourceFileError | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    async (name: string, bytes: Uint8Array) => {
      setReading(true);
      setError(null);
      try {
        const result = await fileToAiSource({ name, bytes });
        if (isAiFileSourceError(result)) {
          setError({ code: result.error, ext: result.ext, chars: result.chars });
          setFileName(null);
          return;
        }
        setFileName(name);
        onSource(result, name);
      } catch (cause) {
        log.error('Nie udało się przetworzyć pliku', { name, cause });
        setError({ code: 'read_failed', ext: '' });
      } finally {
        setReading(false);
      }
    },
    [onSource],
  );

  /** Droga przeglądarki: `<input type=file>` albo `dataTransfer.files`. */
  const acceptBrowserFiles = useCallback(
    async (files: FileList | File[]) => {
      const first = Array.from(files)[0];
      if (!first) return;
      await accept(first.name, new Uint8Array(await first.arrayBuffer()));
    },
    [accept],
  );

  /** Droga Tauri: ścieżka z dialogu albo z upuszczenia. */
  const acceptPath = useCallback(
    async (path: string) => {
      try {
        await accept(fileNameFromPath(path), await readFile(path));
      } catch (cause) {
        log.error('Nie udało się odczytać pliku z dysku', { path, cause });
        setError({ code: 'read_failed', ext: '' });
      }
    },
    [accept],
  );

  /** „Wybierz z dysku" — dialog systemowy w Tauri; w przeglądarce zwraca `false`, niech komponent kliknie `<input>`. */
  const pick = useCallback(async () => {
    if (!runningInTauri()) return false;
    const [first] = await openFilesDialog();
    if (first) await acceptPath(first);
    return true;
  }, [acceptPath]);

  useEffect(() => {
    if (!active || !runningInTauri()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void onFilesDropped(
      (paths) => {
        const [first] = paths;
        if (first) void acceptPath(first);
      },
      (hovering) => setDragging(hovering),
    ).then((stop) => {
      if (cancelled) stop();
      else unlisten = stop;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [active, acceptPath]);

  const clear = useCallback(() => {
    setFileName(null);
    setError(null);
  }, []);

  return {
    fileName,
    error,
    reading,
    dragging,
    setDragging,
    pick,
    acceptBrowserFiles,
    clear,
  };
}
