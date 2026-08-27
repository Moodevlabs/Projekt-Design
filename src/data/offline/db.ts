import { createLogger } from '@/lib/logger';
import { runningInTauri } from '@/lib/tauri';

/**
 * Lokalna baza SQLite (T-29).
 *
 * ## Dlaczego to jest opcjonalne, a nie obowiązkowe
 *
 * W przeglądarce (`pnpm dev`) mostu Tauri nie ma, więc **każda operacja
 * cicho nic nie robi** i zwraca wartość pustą. Aplikacja ma działać tak samo
 * jak wcześniej, tylko bez kolejki offline — a nie wywalać się na starcie.
 *
 * Dlatego wszystko tutaj zwraca `Promise` i nigdy nie rzuca z powodu braku
 * Tauri. Rzuca wyłącznie wtedy, gdy baza JEST, ale zapytanie się nie udało —
 * bo to znaczy, że coś naprawdę jest nie tak z dyskiem.
 */

const log = createLogger('offline.db');

/** Typ minimalny — tyle z API wtyczki faktycznie używamy. */
interface SqlDatabase {
  execute(query: string, values?: unknown[]): Promise<unknown>;
  select<T>(query: string, values?: unknown[]): Promise<T>;
}

let handle: Promise<SqlDatabase | null> | null = null;

/**
 * Schemat lokalnej bazy.
 *
 * **Nie jest lustrem schematu z Postgresa.** Trzymamy tu wyłącznie to, co
 * ratuje pracę: kolejkę wysyłki i podręczne kopie dokumentów, które były
 * otwarte. Odwzorowanie całej bazy znaczyłoby utrzymywanie dwóch schematów
 * i dwóch zestawów migracji.
 */
const SCHEMA = [
  `create table if not exists outbox (
     id text primary key,
     kind text not null,
     target_id text not null,
     payload text not null,
     base_updated_at text,
     created_at text not null,
     attempts integer not null default 0,
     status text not null default 'pending',
     last_error text
   )`,
  `create index if not exists outbox_status_idx on outbox (status, created_at)`,
  // Podręczna kopia dokumentu — żeby otwarta wycena dała się wyświetlić
  // po restarcie aplikacji bez sieci.
  `create table if not exists quote_cache (
     id text primary key,
     data text not null,
     cached_at text not null
   )`,
];

async function open(): Promise<SqlDatabase | null> {
  if (!runningInTauri()) return null;

  try {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    const db = (await Database.load('sqlite:toolier-offline.db')) as unknown as SqlDatabase;
    for (const statement of SCHEMA) {
      await db.execute(statement);
    }
    return db;
  } catch (error) {
    // Brak dostępu do dysku nie może zablokować aplikacji — traci wtedy
    // kolejkę offline, ale nadal działa online.
    log.error('Nie udalo sie otworzyc lokalnej bazy', error);
    return null;
  }
}

/** Uchwyt do bazy; `null`, gdy jej nie ma (przeglądarka albo błąd otwarcia). */
export function getLocalDb(): Promise<SqlDatabase | null> {
  handle ??= open();
  return handle;
}

/** Tylko do testów — zeruje memoizowany uchwyt. */
export function resetLocalDb(): void {
  handle = null;
}

export async function localExecute(query: string, values: unknown[] = []): Promise<void> {
  const db = await getLocalDb();
  if (!db) return;
  await db.execute(query, values);
}

export async function localSelect<T>(query: string, values: unknown[] = []): Promise<T[]> {
  const db = await getLocalDb();
  if (!db) return [];
  return db.select<T[]>(query, values);
}

/** Czy kolejka offline jest w ogóle dostępna na tym środowisku. */
export async function localDbAvailable(): Promise<boolean> {
  return (await getLocalDb()) !== null;
}
