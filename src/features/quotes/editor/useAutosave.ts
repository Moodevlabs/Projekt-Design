import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from './editor.store';
import { useSaveQuote } from '@/data/queries/useQuotes';
import { ConflictError } from '@/data/repos/errors';
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
 */
export function useAutosave() {
  const save = useSaveQuote();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);

  const flush = useCallback(async () => {
    const state = useEditorStore.getState();
    const { quoteId, body, lastSeenUpdatedAt, hasConflict } = state;

    if (!quoteId || !body || !lastSeenUpdatedAt) return;
    // `hasConflict`, a nie `saveState === 'conflict'`: kolejna edycja przestawia
    // `saveState` z powrotem na `dirty`, a mimo to zapisywac dalej nie wolno.
    if (hasConflict) return;
    if (inFlight.current) return;

    inFlight.current = true;
    state.markSaving();

    try {
      const saved = await save.mutateAsync({ id: quoteId, body, lastSeenUpdatedAt });
      useEditorStore.getState().markSaved(saved.updatedAt, new Date().toISOString());
    } catch (error) {
      if (error instanceof ConflictError) {
        useEditorStore.getState().markConflict();
      } else {
        log.error('Autozapis nieudany', error);
        const message = error instanceof Error ? error.message : 'Nieznany błąd';
        useEditorStore.getState().markError(message);
      }
    } finally {
      inFlight.current = false;
    }
  }, [save]);

  // Nasłuchujemy na **zmianę identyczności `body`**, a nie na wejście w stan
  // `dirty`. Gdyby reagować tylko na przejście idle→dirty, kolejne naciśnięcia
  // klawiszy nie resetowałyby debounce'a i zapis leciałby 800 ms po *pierwszej*
  // zmianie zamiast po ostatniej.
  //
  // Warunek `saveState === 'dirty'` odsiewa `load()` (ustawia `body`, ale zostaje
  // `idle`), a immer gwarantuje, że przełączenie trybu podglądu nie rusza `body`.
  useEffect(() => {
    const unsubscribe = useEditorStore.subscribe((state, previous) => {
      if (state.body === previous.body) return;
      if (state.saveState !== 'dirty' || state.hasConflict) return;

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    });

    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  /** `Ctrl/⌘+S` — wymusza zapis bez czekania na debounce. */
  const saveNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void flush();
  }, [flush]);

  return { saveNow };
}
