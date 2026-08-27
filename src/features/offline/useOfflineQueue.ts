import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useConnectivity } from '@/data/offline/connectivity';
import { listOutbox } from '@/data/offline/outbox.repo';
import { flushOutbox } from '@/data/offline/sync';
import { queryKeys } from '@/data/query-keys';
import { countBlocked, countPending, type OutboxEntry } from '@/domain/offline/outbox';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('offline.queue');

/** Co ile odświeżamy podgląd kolejki, gdy coś w niej leży. */
const REFRESH_MS = 10_000;

export interface OfflineState {
  online: boolean;
  queue: OutboxEntry[];
  pendingCount: number;
  blockedCount: number;
  flushing: boolean;
  flushNow: () => void;
}

/**
 * Stan pracy bez sieci dla całej aplikacji (T-29).
 *
 * Wołane raz, w powłoce. Trzy zadania:
 *  1. wie, czy jest sieć (`useConnectivity` — nie samo `navigator.onLine`);
 *  2. trzyma podgląd kolejki do paska;
 *  3. **odtwarza kolejkę w chwili powrotu sieci**, bez pytania.
 *
 * Automatyczne wysłanie jest tu właściwe, bo nie jest nową decyzją: te zmiany
 * użytkownik już zrobił i już chciał zapisać. Pytanie „wysłać?" po powrocie
 * Wi-Fi byłoby pytaniem o coś, co zostało postanowione godzinę wcześniej.
 *
 * Konflikty są wyjątkiem — te **zatrzymują się** i czekają.
 */
export function useOfflineQueue(): OfflineState {
  const { online } = useConnectivity();
  const [queue, setQueue] = useState<OutboxEntry[]>([]);
  const [flushing, setFlushing] = useState(false);
  const queryClient = useQueryClient();
  const wasOnline = useRef(online);

  const refresh = useCallback(() => {
    void listOutbox()
      .then(setQueue)
      .catch((error) => log.warn('Nie udalo sie odczytac kolejki', error));
  }, []);

  const flushNow = useCallback(() => {
    setFlushing(true);
    void flushOutbox()
      .then((result) => {
        setQueue(result.queue);
        if (result.sent > 0) {
          toast.success(pl.offline.sent(result.sent));
          // Wysłane zmiany są w bazie, ale nie w cache — lista i otwarty
          // dokument pokazywałyby stan sprzed wysyłki.
          void queryClient.invalidateQueries({ queryKey: queryKeys.quotes() });
        }
        if (result.conflicts > 0) toast.error(pl.offline.conflicts(result.conflicts));
      })
      .catch((error) => log.error('Odtwarzanie kolejki nieudane', error))
      .finally(() => setFlushing(false));
  }, [queryClient]);

  useEffect(refresh, [refresh]);

  // Powrót sieci — jedyny moment, w którym wysyłamy sami.
  useEffect(() => {
    const cameBack = !wasOnline.current && online;
    wasOnline.current = online;
    if (cameBack) flushNow();
  }, [online, flushNow]);

  // Podgląd odświeżamy tylko wtedy, gdy jest co pokazywać — pusty pasek nie
  // ma powodu odpytywać dysku co dziesięć sekund.
  useEffect(() => {
    if (queue.length === 0) return;
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [queue.length, refresh]);

  return {
    online,
    queue,
    pendingCount: countPending(queue),
    blockedCount: countBlocked(queue),
    flushing,
    flushNow,
  };
}
