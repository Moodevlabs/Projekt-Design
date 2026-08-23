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

/** Zapis odrzucony przez RLS — najczęściej wygasł dostęp (tryb tylko do odczytu). */
export class ReadOnlyError extends RepoError {
  constructor(message = 'Dostęp wygasł — zapis jest zablokowany. Wyceny możesz dalej przeglądać i eksportować.') {
    super(message);
    this.name = 'ReadOnlyError';
  }
}

/**
 * `42501` to jedyny kod, po którym wolno orzec „to RLS”.
 *
 * Kusi, żeby dopisać tu `PGRST116` („brak wiersza”) — ale ten kod dostajemy
 * też, gdy rekord po prostu nie istnieje albo zmienił się w międzyczasie.
 * Nazwanie tego wygasłym dostępem wysyłałoby ludzi do płatności za cudzy błąd.
 * Zablokowany UPDATE i tak nie dociera tutaj: gasimy go w UI, zanim poleci
 * (patrz `useAutosave`).
 */
const RLS_DENIED = '42501';

export function toRepoError(error: PostgrestError, context: string): RepoError {
  if (error.code === RLS_DENIED) {
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
