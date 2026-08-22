import type { PostgrestError } from '@supabase/supabase-js';

/** Błąd warstwy danych z komunikatem gotowym do pokazania użytkownikowi. */
export class RepoError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'RepoError';
  }
}

/**
 * Zapis odrzucony, bo rekord zmienił się w międzyczasie (porównanie `updated_at`).
 * UI pokazuje „Wycena zmieniona w innym miejscu — przeładuj".
 */
export class ConflictError extends RepoError {
  constructor(message = 'Rekord zmienił się w innym miejscu.') {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Zapis odrzucony przez RLS — najczęściej wygasła subskrypcja (read-only). */
export class ReadOnlyError extends RepoError {
  constructor(message = 'Tryb tylko do odczytu — subskrypcja nie pozwala na zapis.') {
    super(message);
    this.name = 'ReadOnlyError';
  }
}

/** Kody PostgREST/Postgres, które oznaczają odbicie się od RLS. */
const RLS_CODES = new Set(['42501', 'PGRST301', 'PGRST116']);

export function toRepoError(error: PostgrestError, context: string): RepoError {
  if (RLS_CODES.has(error.code) && error.code === '42501') {
    return new ReadOnlyError();
  }
  if (error.code === '23505') {
    return new RepoError('Taki rekord już istnieje.', error);
  }
  return new RepoError(`${context}: ${error.message}`, error);
}

/** Rozpakowuje odpowiedź PostgREST albo rzuca `RepoError`. */
export function unwrap<T>(
  result: { data: T | null; error: PostgrestError | null },
  context: string,
): T {
  if (result.error) throw toRepoError(result.error, context);
  if (result.data === null) throw new RepoError(`${context}: brak danych`);
  return result.data;
}
