import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from './editor.store';
import { useSaveQuote } from '@/data/queries/useQuotes';
import { ConflictError } from '@/data/repos/errors';
import { onWindowCloseRequested, runningInTauri } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';

const log = createLogger('autosave');

/** Debounce z 00-PRD §4.1 — zapisujemy 800 ms po ostatnim naciśnięciu klawisza. */
export const AUTOSAVE_DELAY_MS = 800;

/**
 * Autozapis edytora.
 *
 * Zasady, które nie są oczywiste:
 *  - Zapisujemy **cały dokument**, a nie różnicę — `body` to jeden JSONB.
 *  - Po konflikcie `updated_at` **nie ponawiamy** zapisu. Ponowienie nadpisałoby
 *    zmiany zrobione gdzie indziej; użytkownik musi przeładować.
 *  - Zapis w locie nie blokuje dalszego pisania: kolejne zmiany znów ustawiają
 *    `dirty`, więc po powrocie z serwera zaplanuje się następny zapis.
 *  - **Wyjście domyka zapis.** Debounce zostawiał okno 800 ms, w którym zmiana
 *    istniała tylko w pamięci: przejście na inną stronę kasowało timer i nie
 *    zapisywało niczego. Dlatego odmontowanie edytora i zamknięcie okna
 *    wymuszają zapis oczekujących zmian.
 */
export function useAutosave() {
  const save = useSaveQuote();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Zapis w locie — trzymamy obietnicę, bo wyjście musi mieć na co poczekać. */
  const inFlight = useRef<Promise<void> | null>(null);

  const runSave = useCallback(async () => {
    const state = useEditorStore.getState();
    const { quoteId, body, number, lastSeenUpdatedAt, hasConflict } = state;

    if (!quoteId || !body || !lastSeenUpdatedAt) return;
    // `hasConflict`, a nie `saveState === 'conflict'`: kolejna edycja przestawia
    // `saveState` z powrotem na `dirty`, a mimo to zapisywac dalej nie wolno.
    if (hasConflict) return;

    state.markSaving();

    try {
      const saved = await save.mutateAsync({
        id: quoteId,
        body,
        lastSeenUpdatedAt,
        ...(number ? { number } : {}),
      });
      // Zapis może wrócić już po wyjściu z edytora, kiedy store trzyma inną
      // wycenę (albo nic). Wtedy nie wolno mu ruszać cudzego stanu.
      if (useEditorStore.getState().quoteId !== quoteId) return;
      useEditorStore.getState().markSaved(saved.updatedAt, new Date().toISOString());
    } catch (error) {
      if (useEditorStore.getState().quoteId !== quoteId) {
        log.error('Zapis po wyjsciu z edytora nieudany', error);
        return;
      }
      if (error instanceof ConflictError) {
        useEditorStore.getState().markConflict();
      } else {
        log.error('Autozapis nieudany', error);
        const message = error instanceof Error ? error.message : 'Nieznany błąd';
        useEditorStore.getState().markError(message);
      }
    }
  }, [save]);

  /**
   * `wait` rozstrzyga, co zrobić z zapisem, który już leci.
   *
   * Autozapis go pomija: kolejna zmiana i tak ustawi `dirty` i zaplanuje
   * następny przebieg, więc kolejkowanie tylko mnożyłoby round-tripy. Wyjście
   * przeciwnie — musi poczekać i dopisać to, co powstało w trakcie tamtego
   * zapisu, bo drugiej okazji nie będzie.
   */
  const flush = useCallback(
    async ({ wait = false }: { wait?: boolean } = {}) => {
      if (inFlight.current) {
        if (!wait) return;
        await inFlight.current;
      }

      const promise = runSave();
      inFlight.current = promise;
      try {
        await promise;
      } finally {
        if (inFlight.current === promise) inFlight.current = null;
      }
    },
    [runSave],
  );

  /** Czy jest coś, czego serwer jeszcze nie widział. */
  const hasPendingWork = () => {
    const { saveState, hasConflict } = useEditorStore.getState();
    return !hasConflict && (saveState === 'dirty' || timer.current !== null);
  };

  /** Domknięcie zapisu przy wyjściu — czeka też na zapis będący w locie. */
  const flushPending = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!hasPendingWork()) return;
    await flush({ wait: true });
  }, [flush]);

  // Nasłuchujemy na **zmianę identyczności `body`**, a nie na wejście w stan
  // `dirty`. Gdyby reagować tylko na przejście idle→dirty, kolejne naciśnięcia
  // klawiszy nie resetowałyby debounce'a i zapis leciałby 800 ms po *pierwszej*
  // zmianie zamiast po ostatniej.
  //
  // Warunek `saveState === 'dirty'` odsiewa `load()` (ustawia `body`, ale zostaje
  // `idle`), a immer gwarantuje, że przełączenie trybu podglądu nie rusza `body`.
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      // Numer nie siedzi w `body`, wiec jego zmiane sledzimy osobno.
      if (state.body === previous.body && state.number === previous.number) return;
      if (state.saveState !== 'dirty' || state.hasConflict) return;

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void flush();
      }, AUTOSAVE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      // Wyjście z edytora nie może zjeść ostatniej zmiany. Zapis jest
      // asynchroniczny i przeżyje odmontowanie — `runSave` czyta store
      // synchronicznie, zanim strona zdąży go wyczyścić.
      void flushPending();
    };
  }, [flush, flushPending]);

  /**
   * Zamknięcie okna. W Tauri wstrzymujemy zamknięcie do czasu zapisu — inaczej
   * proces zniknąłby razem z niezapisaną wyceną. W przeglądarce (`pnpm dev`)
   * nie da się poczekać na obietnicę, więc zostaje natywne ostrzeżenie.
   */
  useEffect(() => {
    if (runningInTauri()) {
      let unlisten: (() => void) | undefined;
      let cancelled = false;

      void onWindowCloseRequested(flushPending).then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      });

      return () => {
        cancelled = true;
        unlisten?.();
      };
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingWork()) return;
      void flushPending();
      event.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [flushPending]);

  /** `Ctrl/⌘+S` — wymusza zapis bez czekania na debounce. */
  const saveNow = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    void flush();
  }, [flush]);

  return { saveNow };
}
