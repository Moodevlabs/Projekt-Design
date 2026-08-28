/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { checkShareBaseUrl } from './src/domain/share/base-url';

const host = process.env.TAURI_DEV_HOST;

/**
 * Bramka na adres strony klienta — tylko dla builda PRODUKCYJNEGO.
 *
 * `VITE_SHARE_BASE_URL` jest wkompilowywane w aplikację i decyduje o adresie,
 * który projektant wysyła inwestorowi. Zła wartość nie wywraca niczego głośno:
 * `ShareDialog` po prostu pokazuje goły token zamiast linku, a dowiadujemy się
 * o tym dopiero, gdy ktoś próbuje wysłać ofertę. Ponieważ wartość wchodzi do
 * paczki na stałe, naprawa oznacza NOWE WYDANIE — dlatego lepiej przerwać
 * build teraz niż podpisywać i notaryzować zepsutą aplikację.
 *
 * Warunek zawężony do `VITE_APP_ENV === 'prod'`, czyli do tego, co ustawia
 * `.github/workflows/release.yml`. Lokalne `pnpm build` i `pnpm tauri dev`
 * mają działać bez kompletu sekretów.
 */
function assertShareBaseUrl(mode: string) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (env.VITE_APP_ENV !== 'prod') return;

  const result = checkShareBaseUrl(env.VITE_SHARE_BASE_URL);
  if (result.ok) return;

  throw new Error(
    `VITE_SHARE_BASE_URL ${result.reason}\n` +
      'Ustaw sekret na adres strony klienta (produkcja: https://klient.toolier.pl) ' +
      'i zbuduj wydanie ponownie.',
  );
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') assertShareBaseUrl(mode);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Tauri oczekuje stałego portu i nie lubi, gdy Vite ucieka na inny.
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
      watch: { ignored: ['**/src-tauri/**'] },
    },
    envPrefix: ['VITE_', 'TAURI_ENV_'],
    build: {
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      // Testy integracyjne chodza osobno (`pnpm test:db`) — wymagaja Dockera.
      exclude: ['**/node_modules/**', '**/dist/**', 'src/**/*.integration.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/domain/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },
  };
});
