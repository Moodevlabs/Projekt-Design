import { z } from 'zod';

/**
 * Kolejka wysyłki zmian zrobionych bez sieci (T-29).
 *
 * ## Co ten moduł rozwiązuje
 *
 * Najbardziej bolesna strata w Toolier to **edycja wyceny przy zerwanej
 * sieci**: autozapis leci co 800 ms, każdy nieudany przepada, a człowiek
 * dowiaduje się o tym dopiero z czerwonego wskaźnika. Kolejka zapisuje takie
 * zmiany lokalnie (SQLite) i odtwarza je po powrocie sieci.
 *
 * ## Czym to NIE jest
 *
 * To **nie** jest tryb offline-first. Nie da się bez sieci założyć klienta,
 * projektu ani nowej wyceny — do tego trzeba lokalnych identyfikatorów
 * i mapowania ich na serwerowe, czyli osobnego zadania. Tutaj chodzi o to,
 * żeby **praca już rozpoczęta nie przepadła**.
 *
 * ## Zasada, na której stoi całość
 *
 * **Nigdy nie nadpisujemy po cichu.** Wpis niesie `baseUpdatedAt` — stan
 * dokumentu, na którym pracował autor. Jeśli serwer ma nowszy, odtworzenie
 * **zatrzymuje się** i pyta człowieka. Cicha wygrana ostatniego zapisu jest
 * gorsza niż konflikt: kasuje pracę, której nikt nie widział.
 */

export const OutboxKindSchema = z.enum(['quote.save']);
export type OutboxKind = z.infer<typeof OutboxKindSchema>;

export const OutboxStatusSchema = z.enum(['pending', 'sending', 'conflict', 'failed']);
export type OutboxStatus = z.infer<typeof OutboxStatusSchema>;

export const OutboxEntrySchema = z.object({
  id: z.string(),
  kind: OutboxKindSchema,
  /** Czego dotyczy — id wyceny. Klucz koalescencji (patrz `enqueue`). */
  targetId: z.string(),
  /** Ładunek zapisu (dla `quote.save`: `body`, `schedule`, `documents`…). */
  payload: z.unknown(),
  /**
   * `updated_at` wiersza, na którym pracował autor. Serwer odrzuci zapis,
   * gdy w międzyczasie ktoś ruszył dokument — i o to chodzi.
   */
  baseUpdatedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  attempts: z.number().int().nonnegative().default(0),
  status: OutboxStatusSchema.default('pending'),
  lastError: z.string().nullable().default(null),
});
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>;

/**
 * Po ilu nieudanych próbach przestajemy sami ponawiać.
 *
 * Nie kasujemy wpisu — zmienia status na `failed` i czeka na człowieka.
 * Wyrzucenie cudzej pracy po trzech błędach sieci byłoby dokładnie tym,
 * czemu ta kolejka ma zapobiegać.
 */
export const MAX_ATTEMPTS = 5;

/**
 * Dopisuje zmianę do kolejki, **koalescując po celu**.
 *
 * Autozapis przy godzinie pracy bez sieci wygenerowałby setki wpisów dla
 * jednej wyceny. Odtwarzanie ich po kolei nie ma sensu: liczy się stan
 * końcowy. Zostaje więc **jeden wpis na dokument**, z najnowszym ładunkiem.
 *
 * ⚠️ `baseUpdatedAt` bierzemy z **pierwszego** wpisu, nie z ostatniego.
 * To jest stan, który autor faktycznie widział, zanim zaczął pisać bez
 * sieci. Podmiana na nowszy udawałaby, że widział też cudze zmiany.
 */
export function enqueue(queue: readonly OutboxEntry[], entry: OutboxEntry): OutboxEntry[] {
  const existing = queue.find(
    (row) =>
      row.kind === entry.kind && row.targetId === entry.targetId && row.status !== 'conflict',
  );

  if (!existing) return [...queue, entry];

  return queue.map((row) =>
    row.id === existing.id
      ? {
          ...row,
          payload: entry.payload,
          createdAt: entry.createdAt,
          // Konflikt trzeba rozwiązać świadomie; nowy zapis nie kasuje jego
          // śladu, ale wraca do kolejki jako zwykłe oczekiwanie.
          status: 'pending',
          attempts: 0,
          lastError: null,
        }
      : row,
  );
}

/**
 * Wpisy do wysłania, **najstarsze pierwsze**.
 *
 * Kolejność ma znaczenie nawet przy koalescencji: dwie różne wyceny mogą
 * zależeć od siebie w głowie użytkownika („najpierw poprawiłem v1, potem
 * zrobiłem v2"), a odwrócenie kolejności dałoby mu niespodziankę.
 *
 * `conflict` i `failed` **nie wchodzą** — czekają na decyzję człowieka.
 */
export function pending(queue: readonly OutboxEntry[]): OutboxEntry[] {
  return queue
    .filter((row) => row.status === 'pending')
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function countPending(queue: readonly OutboxEntry[]): number {
  return queue.filter((row) => row.status === 'pending' || row.status === 'sending').length;
}

export function countBlocked(queue: readonly OutboxEntry[]): number {
  return queue.filter((row) => row.status === 'conflict' || row.status === 'failed').length;
}

/** Wynik próby wysłania jednego wpisu. */
export type SendOutcome =
  { kind: 'ok' } | { kind: 'conflict'; message: string } | { kind: 'error'; message: string };

/**
 * Nowy stan wpisu po próbie wysłania.
 *
 * `null` = wpis znika z kolejki (poszedł).
 */
export function afterSend(entry: OutboxEntry, outcome: SendOutcome): OutboxEntry | null {
  if (outcome.kind === 'ok') return null;

  const attempts = entry.attempts + 1;

  if (outcome.kind === 'conflict') {
    // Konflikt nie jest błędem sieci — ponawianie go nie naprawi, a każda
    // kolejna próba tylko oddala moment, w którym człowiek się o nim dowie.
    return { ...entry, attempts, status: 'conflict', lastError: outcome.message };
  }

  return {
    ...entry,
    attempts,
    status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
    lastError: outcome.message,
  };
}

/**
 * Opóźnienie przed kolejną próbą (ms) — wykładnicze, z sufitem.
 *
 * Sufit jest po to, żeby aplikacja zostawiona na noc przy padniętej sieci
 * nie czekała rano pół godziny na pierwszą próbę.
 */
export function retryDelayMs(attempts: number): number {
  const base = 2_000 * Math.pow(2, Math.max(0, attempts));
  return Math.min(base, 60_000);
}

/** Czy jest cokolwiek, o czym trzeba powiedzieć użytkownikowi. */
export function needsAttention(queue: readonly OutboxEntry[]): boolean {
  return countBlocked(queue) > 0;
}
