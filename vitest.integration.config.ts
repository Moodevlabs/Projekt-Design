import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Testy integracyjne repozytoriów — wymagają uruchomionego lokalnego Supabase
 * (`pnpm db:start`). Trzymamy je poza domyślnym `pnpm test`, żeby zestaw
 * jednostkowy dalej działał na maszynie bez Dockera.
 *
 * Klucz anon poniżej to standardowy, publiczny klucz demo lokalnego stacku
 * Supabase — identyczny na każdej maszynie, nie jest sekretem.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Wspólny użytkownik i workspace — równoległe pliki deptałyby sobie po danych.
    fileParallelism: false,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      VITE_APP_ENV: 'local',
    },
  },
});
