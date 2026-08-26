import { useCallback, useEffect, useState } from 'react';

import { createLogger } from '@/lib/logger';
import { runningInTauri } from '@/lib/tauri';

const log = createLogger('updater');

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current' }
  | { kind: 'available'; version: string; notes: string | null; date: string | null }
  | { kind: 'downloading'; percent: number | null }
  | { kind: 'ready' }
  | { kind: 'error'; message: string };

/**
 * Auto-update aplikacji (T-19).
 *
 * Wtyczki Tauri importujemy **dynamicznie**, dopiero po sprawdzeniu
 * `runningInTauri()`. W przeglądarce (`pnpm dev`) ich most nie istnieje,
 * a statyczny import wywaliłby stronę przy samym wczytaniu modułu.
 *
 * Aktualizacja **nie instaluje się sama**. Toolier jest narzędziem pracy:
 * restart w środku przygotowywania oferty dla klienta jest gorszy niż
 * dzień zwłoki z poprawką. Sprawdzamy w tle, instalujemy na kliknięcie.
 */
export function useAppUpdate(): {
  state: UpdateState;
  check: () => Promise<void>;
  install: () => Promise<void>;
  supported: boolean;
} {
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const supported = runningInTauri();

  const check = useCallback(async () => {
    if (!supported) return;
    setState({ kind: 'checking' });
    try {
      const { check: checkUpdate } = await import('@tauri-apps/plugin-updater');
      const update = await checkUpdate();
      if (!update) {
        setState({ kind: 'current' });
        return;
      }
      setState({
        kind: 'available',
        version: update.version,
        notes: update.body ?? null,
        date: update.date ?? null,
      });
    } catch (error) {
      // Brak sieci albo niedostępny endpoint nie jest awarią aplikacji —
      // ma się o tym dowiedzieć ten, kto kliknął „Sprawdź", i nikt więcej.
      log.warn('Sprawdzenie aktualizacji nieudane', error);
      setState({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Nie udało się sprawdzić aktualizacji.',
      });
    }
  }, [supported]);

  const install = useCallback(async () => {
    if (!supported) return;
    try {
      const { check: checkUpdate } = await import('@tauri-apps/plugin-updater');
      const update = await checkUpdate();
      if (!update) {
        setState({ kind: 'current' });
        return;
      }

      let total = 0;
      let got = 0;
      setState({ kind: 'downloading', percent: null });

      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          got += event.data.chunkLength;
          // Serwer nie musi podać długości — wtedy pokazujemy sam fakt
          // pobierania zamiast paska, który stoi w miejscu.
          setState({
            kind: 'downloading',
            percent: total > 0 ? Math.min(100, Math.round((got / total) * 100)) : null,
          });
        } else {
          setState({ kind: 'ready' });
        }
      });

      setState({ kind: 'ready' });
    } catch (error) {
      log.error('Instalacja aktualizacji nieudana', error);
      setState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'Nie udało się zainstalować aktualizacji.',
      });
    }
  }, [supported]);

  return { state, check, install, supported };
}

/** Restart po instalacji — osobno, bo to decyzja użytkownika, nie skutek uboczny. */
export async function relaunchApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

/**
 * Ciche sprawdzenie przy starcie.
 *
 * Raz na uruchomienie i bez żadnego komunikatu, gdy nie ma nowej wersji —
 * inaczej każdy start aplikacji zaczynałby się od okienka o niczym.
 */
export function useUpdateCheckOnStart(onAvailable: (version: string) => void): void {
  useEffect(() => {
    if (!runningInTauri()) return;
    let cancelled = false;

    void (async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (!cancelled && update) onAvailable(update.version);
      } catch (error) {
        // Cisza jest tu celowa: nikt o nic nie prosił, więc nikogo nie
        // zawiadamiamy o tym, że sprawdzenie się nie udało.
        log.debug('Ciche sprawdzenie aktualizacji nieudane', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onAvailable]);
}
