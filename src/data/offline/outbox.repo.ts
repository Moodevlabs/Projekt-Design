import { newId } from '@/domain/id';
import {
  enqueue,
  OutboxEntrySchema,
  type OutboxEntry,
  type OutboxKind,
} from '@/domain/offline/outbox';
import { createLogger } from '@/lib/logger';

import { localExecute, localSelect } from './db';

/**
 * Trwała kolejka wysyłki (T-29).
 *
 * Stan żyje w SQLite, a nie w pamięci — inaczej zamknięcie aplikacji przy
 * padniętej sieci kasowałoby dokładnie tę pracę, którą kolejka ma ratować.
 *
 * Koalescencja i reguły przejść siedzą w `domain/offline/outbox`; tutaj jest
 * wyłącznie odczyt i zapis.
 */

const log = createLogger('offline.outbox');

interface Row {
  id: string;
  kind: string;
  target_id: string;
  payload: string;
  base_updated_at: string | null;
  created_at: string;
  attempts: number;
  status: string;
  last_error: string | null;
}

function mapRow(row: Row): OutboxEntry | null {
  const parsed = OutboxEntrySchema.safeParse({
    id: row.id,
    kind: row.kind,
    targetId: row.target_id,
    payload: safeJson(row.payload),
    baseUpdatedAt: row.base_updated_at,
    createdAt: row.created_at,
    attempts: Number(row.attempts ?? 0),
    status: row.status,
    lastError: row.last_error,
  });

  if (parsed.success) return parsed.data;
  // Uszkodzony wiersz pomijamy, zamiast wywracać całą kolejkę — reszta pracy
  // ma dojść.
  log.warn('Pomijam uszkodzony wpis kolejki', { id: row.id, issues: parsed.error.issues });
  return null;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const rows = await localSelect<Row>('select * from outbox order by created_at asc');
  return rows.map(mapRow).filter((row): row is OutboxEntry => row !== null);
}

async function writeAll(queue: readonly OutboxEntry[]): Promise<void> {
  // Prościej i bezpieczniej niż wyliczanie różnicy: kolejka ma pojedyncze
  // wpisy (jeden na dokument), więc przepisanie jej w całości kosztuje tyle
  // co nic, a nie da się przy tym zgubić wiersza.
  await localExecute('delete from outbox');
  for (const entry of queue) {
    await localExecute(
      `insert into outbox
         (id, kind, target_id, payload, base_updated_at, created_at, attempts, status, last_error)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.id,
        entry.kind,
        entry.targetId,
        JSON.stringify(entry.payload ?? null),
        entry.baseUpdatedAt,
        entry.createdAt,
        entry.attempts,
        entry.status,
        entry.lastError,
      ],
    );
  }
}

export interface EnqueueInput {
  kind: OutboxKind;
  targetId: string;
  payload: unknown;
  baseUpdatedAt: string | null;
}

/** Dopisuje zmianę do kolejki i zwraca jej stan po dopisaniu. */
export async function enqueueChange(input: EnqueueInput): Promise<OutboxEntry[]> {
  const queue = await listOutbox();
  const next = enqueue(queue, {
    id: newId(),
    kind: input.kind,
    targetId: input.targetId,
    payload: input.payload,
    baseUpdatedAt: input.baseUpdatedAt,
    createdAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
    lastError: null,
  });
  await writeAll(next);
  return next;
}

/** Zapisuje nowy stan całej kolejki (po próbie wysłania). */
export async function saveOutbox(queue: readonly OutboxEntry[]): Promise<void> {
  await writeAll(queue);
}

/** Usuwa jeden wpis — używane przy „odrzuć moją wersję" po konflikcie. */
export async function dropEntry(id: string): Promise<void> {
  await localExecute('delete from outbox where id = $1', [id]);
}

/* ---------------------------------------------------------------------------
 * Podręczna kopia dokumentu
 * ------------------------------------------------------------------------ */

export async function cacheQuote(id: string, data: unknown): Promise<void> {
  await localExecute(
    `insert into quote_cache (id, data, cached_at) values ($1, $2, $3)
     on conflict (id) do update set data = excluded.data, cached_at = excluded.cached_at`,
    [id, JSON.stringify(data), new Date().toISOString()],
  );
}

/** Ostatnia znana treść wyceny; `null`, gdy nigdy jej nie otwarto offline. */
export async function readCachedQuote(id: string): Promise<unknown> {
  const rows = await localSelect<{ data: string }>('select data from quote_cache where id = $1', [
    id,
  ]);
  const raw = rows[0]?.data;
  return raw === undefined ? null : safeJson(raw);
}
