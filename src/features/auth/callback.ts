import { getSupabase } from '@/data/supabase';

/**
 * Powrót z maila do aplikacji — wymiana kodu na sesję.
 *
 * ## Skąd ten plik
 *
 * Do T-119 mieszkało to w `oauth.ts` razem z logowaniem Google i nazywało się
 * `completeOAuthFromUrl`. Google wypadło (decyzja właściciela 2026-08-31),
 * ale **wymiana kodu została** — i to nie jest pozostałość po OAuth, tylko
 * mechanizm, na którym stoją dwie żywe ścieżki:
 *
 *  - `toolier://auth/callback?code=…`  — potwierdzenie adresu przy rejestracji,
 *  - `toolier://auth/recovery?code=…`  — powrót z maila „reset hasła".
 *
 * Obie przychodzą tą samą drogą (Supabase weryfikuje token po swojej stronie
 * i przekierowuje na deep link z kodem PKCE), więc obsługuje je jeden kod.
 * Nazwa bez „OAuth" jest tu istotna: gdyby została, następna osoba czytająca
 * `deep-links.ts` uznałaby ten tor za martwy kod po Google i skasowała go
 * razem z logowaniem — a wtedy nikt nie potwierdzi rejestracji.
 */

/**
 * Deep link, na który Supabase odsyła po kliknięciu w mail potwierdzający.
 *
 * Podaje go `RegisterPage` jako `emailRedirectTo` (T-118). Musi stać na liście
 * **Redirect URLs** w panelu Supabase — adresu spoza listy Supabase nie
 * odrzuca, tylko po cichu zamienia na Site URL projektu.
 */
export const AUTH_CALLBACK_URL = 'toolier://auth/callback';

/**
 * Wymienia kod z deep linka na sesję. Zwraca `true`, jeśli URL faktycznie
 * niósł kod autoryzacyjny.
 */
export async function completeAuthFromUrl(url: string): Promise<boolean> {
  const parsed = safeParseUrl(url);
  if (!parsed) return false;

  // Supabase potrafi oddać kod w query albo we fragmencie — sprawdzamy oba.
  const params = new URLSearchParams(parsed.search.replace(/^\?/, ''));
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const code = params.get('code') ?? hashParams.get('code');

  const errorDescription = params.get('error_description') ?? hashParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);
  if (!code) return false;

  const { error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
  return true;
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
