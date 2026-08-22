import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/data/types.generated';
import { env, isConfigured } from '@/lib/env';
import { createSessionStorage } from '@/data/session-storage';

export type AnzorgeClient = SupabaseClient<Database>;

/**
 * Jedyna instancja klienta. Komponenty jej nie widzą — chodzą przez `data/repos`.
 *
 * `detectSessionInUrl: false`, bo w aplikacji desktopowej powrót z OAuth idzie
 * deep linkiem (`anzorge://auth/callback`), a nie przez adres w oknie.
 */
let client: AnzorgeClient | null = null;

export function getSupabase(): AnzorgeClient {
  if (!isConfigured) {
    throw new Error('Brak konfiguracji Supabase — uzupełnij VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY w .env');
  }
  client ??= createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: createSessionStorage(),
      storageKey: 'anzorge-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}

/** Tylko do testów — zeruje memoizowaną instancję. */
export function resetSupabaseClient(): void {
  client = null;
}
