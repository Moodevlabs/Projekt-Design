import { saveQuote, type SaveQuoteInput } from '@/data/repos/quotes.repo';
import { ConflictError } from '@/data/repos/errors';
import { afterSend, pending, type OutboxEntry, type SendOutcome } from '@/domain/offline/outbox';
import { createLogger } from '@/lib/logger';

import { listOutbox, saveOutbox } from './outbox.repo';

/**
 * Odtwarzanie kolejki po powrocie sieci (T-29).
 *
 * Jeden przebieg = jedna próba na każdy oczekujący wpis, **po kolei**.
 * Równoległe wysyłanie skróciłoby czas, ale przy dwóch zapisach tej samej
 * linii wersji dałoby wyścig o `updated_at` — czyli konflikt wygenerowany
 * przez nas samych.
 */

const log = createLogger('offline.sync');

/** Wynik jednego przebiegu — do pokazania człowiekowi. */
export interface FlushResult {
  sent: number;
  conflicts: number;
  failed: number;
  /** Kolejka po przebiegu. */
  queue: OutboxEntry[];
}

async function send(entry: OutboxEntry): Promise<SendOutcome> {
  try {
    switch (entry.kind) {
      case 'quote.save': {
        // Ładunek pochodzi z naszej własnej kolejki, ale przeszedł przez
        // JSON i dysk — traktujemy go jak dane wejściowe.
        const payload = entry.payload as SaveQuoteInput | null;
        if (!payload || typeof payload !== 'object') {
          return { kind: 'error', message: 'Uszkodzony zapis w kolejce.' };
        }
        // Bez punktu odniesienia nie ma jak wykryć konfliktu, a wysłanie
        // zapisu „na ślepo" nadpisałoby cudzą pracę po cichu — czyli
        // dokładnie to, czemu ta kolejka ma zapobiegać.
        if (entry.baseUpdatedAt === null) {
          return { kind: 'conflict', message: 'Brak punktu odniesienia dla tego zapisu.' };
        }
        await saveQuote({
          ...payload,
          id: entry.targetId,
          lastSeenUpdatedAt: entry.baseUpdatedAt,
        });
        return { kind: 'ok' };
      }
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      return { kind: 'conflict', message: error.message };
    }
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Nie udało się wysłać zmiany.',
    };
  }
}

/**
 * Wysyła wszystko, co czeka.
 *
 * **Nie przerywa się na pierwszym błędzie.** Jeden dokument w konflikcie nie
 * ma prawa zablokować pozostałych — inaczej jedna nierozwiązana kolizja
 * trzymałaby całą pracę z dnia.
 */
export async function flushOutbox(): Promise<FlushResult> {
  const queue = await listOutbox();
  const todo = pending(queue);

  if (todo.length === 0) {
    return { sent: 0, conflicts: 0, failed: 0, queue };
  }

  let next = [...queue];
  let sent = 0;
  let conflicts = 0;
  let failed = 0;

  for (const entry of todo) {
    const outcome = await send(entry);
    const updated = afterSend(entry, outcome);

    if (updated === null) {
      next = next.filter((row) => row.id !== entry.id);
      sent += 1;
    } else {
      next = next.map((row) => (row.id === entry.id ? updated : row));
      if (updated.status === 'conflict') conflicts += 1;
      else if (updated.status === 'failed') failed += 1;
    }
  }

  await saveOutbox(next);
  log.info('Kolejka offline odtworzona', { sent, conflicts, failed });

  return { sent, conflicts, failed, queue: next };
}
