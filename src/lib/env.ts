/** Zmienne środowiskowe widoczne dla frontendu (CLAUDE.md §10 — tylko te trzy + env). */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'local') as 'local' | 'staging' | 'prod',
} as const;

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
