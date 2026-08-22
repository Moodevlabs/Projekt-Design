import type { AuthError } from '@supabase/supabase-js';

/** Mapowanie błędów Supabase na komunikaty po polsku. */
export function authErrorMessage(error: AuthError | { message: string; code?: string }): string {
  const code = 'code' in error ? error.code : undefined;

  switch (code) {
    case 'invalid_credentials':
      return 'Nieprawidłowy e-mail lub hasło.';
    case 'email_not_confirmed':
      return 'Potwierdź adres e-mail — sprawdź skrzynkę.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Konto z tym adresem już istnieje.';
    case 'weak_password':
      return 'Hasło jest za słabe — użyj co najmniej 8 znaków.';
    case 'over_email_send_rate_limit':
      return 'Za dużo prób. Spróbuj ponownie za chwilę.';
    case 'same_password':
      return 'Nowe hasło musi różnić się od poprzedniego.';
    default:
      break;
  }

  // Fallback po treści — starsze wersje GoTrue nie zawsze zwracają `code`.
  const message = error.message.toLowerCase();
  if (message.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.';
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Brak połączenia z serwerem. Sprawdź internet.';
  }
  return 'Nie udało się wykonać operacji. Spróbuj ponownie.';
}
