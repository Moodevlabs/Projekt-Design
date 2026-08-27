/** Zmienne środowiskowe widoczne dla frontendu (CLAUDE.md §10 — tylko te trzy + env). */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  /**
   * Adres strony ofert (apps/share). Bez niego link da się utworzyć, ale nie
   * da się go skopiować w gotowej postaci — dlatego pusty ciąg, a nie rzucenie
   * błędem: brak konfiguracji hostingu nie może blokować pracy w aplikacji.
   */
  shareBaseUrl: import.meta.env.VITE_SHARE_BASE_URL ?? '',
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'local') as 'local' | 'staging' | 'prod',
} as const;

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
