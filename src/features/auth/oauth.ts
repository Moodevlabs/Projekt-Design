import { openUrl } from '@tauri-apps/plugin-opener';
import { getSupabase } from '@/data/supabase';
import { runningInTauri } from '@/lib/tauri';

/** Deep link, na który Supabase odsyła po zalogowaniu przez Google. */
export const AUTH_CALLBACK_URL = 'anzorge://auth/callback';

/**
 * Logowanie Google. Checkout OAuth otwieramy w **przeglądarce systemowej**
 * (Google blokuje logowanie w webview), a wracamy deep linkiem z kodem PKCE.
 * `verifier` zostaje w storage klienta, więc wymianę robi ten sam proces.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error('Supabase nie zwrócił adresu logowania Google');

  if (runningInTauri()) {
    await openUrl(data.url);
  } else {
    // `pnpm dev` w przeglądarce — nie ma deep linków, ale da się przetestować sam flow.
    window.location.assign(data.url);
  }
}

/**
 * Wymienia kod z deep linka na sesję. Zwraca `true`, jeśli URL faktycznie
 * niósł kod autoryzacyjny.
 */
export async function completeOAuthFromUrl(url: string): Promise<boolean> {
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
