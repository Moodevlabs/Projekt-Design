import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from './editor.store';
import { useSaveQuote } from '@/data/queries/useQuotes';
import { ConflictError } from '@/data/repos/errors';
import { onWindowCloseRequested, runningInTauri } from '@/lib/tauri';
import { useEntitlement } from '@/features/billing/useEntitlement';
import { toast } from 'sonner';
import { enqueueChange } from '@/data/offline/outbox.repo';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

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
  /**
   * Bez prawa zapisu nie wysylamy niczego.
   *
   * Nie chodzi o dublowanie RLS — ta blokada jest po stronie bazy i tam
   * zostaje. Chodzi o to, ze RLS odrzuca UPDATE **cicho**, zerem zmienionych
   * wierszy, a nasz zapis porownuje `updated_at` i wzialby to za konflikt.
   * Uzytkownik zobaczylby „wycena zmieniona w innym miejscu” zamiast prawdy:
   * ze wygasl mu dostep.
   */
  const canWrite = useEntitlement().canWrite;
  const canWriteRef = useRef(canWrite);
  canWriteRef.current = canWrite;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Zapis w locie — trzymamy obietnicę, bo wyjście musi mieć na co poczekać. */
  const inFlight = useRef<Promise<void> | null>(null);

  const runSave = useCallback(async () => {
    const state = useEditorStore.getState();
    const {
      quoteId,
      clientId,
      projectId,
      body,
      schedule,
      documents,
      number,
      lastSeenUpdatedAt,
      hasConflict,
    } = state;

    if (!quoteId || !body || !lastSeenUpdatedAt) return;
    if (!canWriteRef.current) return;
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
        /*
         * Przypisanie do klienta jedzie z dokumentem, tak jak harmonogram.
         * Wysylamy zawsze to, co jest w store — takze `null`, bo to wartosc
         * wczytana z bazy, wiec zapisanie jej z powrotem niczego nie kasuje.
         */
        clientId,
        projectId,
        /*
         * Harmonogram jedzie RAZEM z dokumentem, a nie osobnym zapisem.
         * Zakladki „Wycena" i „Termin" pisza do tego samego wiersza, wiec dwa
         * niezalezne cykle zapisu deptalyby sobie po `updated_at` i kazdy
         * konczylby sie konfliktem u drugiego.
         *
         * Wysylamy zawsze to, co jest w store — takze `null`, gdy wycena nie
         * ma harmonogramu. To wartosc wczytana z bazy, wiec zapisanie jej
         * z powrotem niczego nie kasuje.
         */
        schedule,
        documents,
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

        /*
         * KOLEJKA OFFLINE (T-29).
         *
         * Nieudany zapis nie znaczy „zmiana przepadła": ląduje w lokalnej
         * bazie i pójdzie, gdy sieć wróci. Kolejka koalescuje po dokumencie,
         * więc godzina pisania bez sieci daje JEDEN wpis, nie setki.
         *
         * Świadomie kolejkujemy **każdy** nieudany zapis, nie tylko te przy
         * `navigator.onLine === false`: rozróżnienie „nie ma sieci" od „serwer
         * odmówił" bywa zawodne, a wpis, który nie miał trafić do kolejki,
         * najwyżej wyśle się jeszcze raz. Odwrotna pomyłka kasuje pracę.
         */
        void enqueueChange({
          kind: 'quote.save',
          targetId: quoteId,
          payload: { body, clientId, projectId, schedule, documents, ...(number ? { number } : {}) },
          baseUpdatedAt: lastSeenUpdatedAt,
        }).catch((queueError) => {
          // Nawet kolejka może nie zadziałać (brak dysku, przeglądarka).
          // Wtedy zostaje sam komunikat — ale o tym też trzeba wiedzieć.
          log.error('Nie udalo sie zakolejkowac zapisu', queueError);
        });

        useEditorStore.getState().markError(message);
        /*
         * POWÓD, nie tylko fakt. Wskaźnik przy numerze wyceny pokazuje ogólne
         * „Błąd zapisu — ponów" i gubi to, co naprawdę poszło nie tak: brak
         * sieci, wygasły dostęp, odrzucenie przez bazę. Człowiek widział mały
         * czerwony napis i nie miał pojęcia, co z nim zrobić — a bez tej
         * informacji nie da się nawet zgłosić sensownego błędu.
         */
        toast.error(`${pl.editor.saveError}: ${message}`);
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
      // Numer i klient nie siedza w `body`, wiec ich zmiany sledzimy osobno.
      // Bez `clientId` przypiecie klienta o danych identycznych z naglowkiem
      // nie ruszyloby `body` i autozapis by nie wystartowal.
      //
      // ⚠️ `schedule` i `documents` TEZ NIE SIEDZA W `body` — i ich brak na tej
      // liscie byl bledem, ktory wyszedl dopiero u uzytkownika (2026-08-27).
      //
      // Objaw: zbudowanie wyceny, dodanie terminu i etapow, a potem
      // udostepnienie klientowi BEZ wychodzenia z edytora dawalo link z sama
      // wycena. Po wyjsciu i ponownym wejsciu ten sam link mial juz komplet.
      //
      // Mechanizm: zakladki „Termin" i „Dokumenty" ustawialy `saveState`
      // na `dirty`, ale ta subskrypcja ich nie widziala, wiec NIE planowala
      // zapisu. Zmiana lezala w pamieci az do odmontowania edytora, gdzie
      // `flushPending()` zapisywal wszystko naraz — stad zludzenie, ze
      // „zapisuje sie dopiero po wyjsciu".
      if (
        state.body === previous.body &&
        state.number === previous.number &&
        state.clientId === previous.clientId &&
        state.projectId === previous.projectId &&
        state.schedule === previous.schedule &&
        state.documents === previous.documents
      ) {
        return;
      }
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
