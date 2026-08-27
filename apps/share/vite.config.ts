import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * Strona oferty dla klienta (T-25b) — druga aplikacja w tym samym repozytorium.
 *
 * ŚWIADOMIE NIE ROBIMY Z TEGO MONOREPO. Wystarczy alias `@` na `src/`, bo
 * `src/domain/` jest wolny od Reacta, Supabase i Tauri (reguła 1 z CLAUDE.md)
 * i da się go użyć w drugiej aplikacji bez przenoszenia czegokolwiek.
 * Przebudowa na `apps/desktop` + `packages/domain` ruszyłaby ścieżki w
 * `tauri.conf.json`, Vitest, ESLint i `components.json` — koszt bez zysku.
 *
 * Ta aplikacja NIE zna Tauri i nie może go poznać: chodzi w przeglądarce
 * inwestora.
 */
export default defineConfig({
  /**
   * BEZ TEGO VITE ZBUDUJE NIE TĘ APLIKACJĘ.
   *
   * `root` domyślnie wskazuje katalog roboczy, czyli korzeń repo — a tam leży
   * `index.html` aplikacji desktopowej. `vite build --config apps/share/...`
   * spakowałby więc główną aplikację (razem z generatorem PDF i tłem ekranu
   * logowania) i zapisał ją jako stronę klienta. Sprawdzone: 3,2 MB nie tego,
   * co trzeba.
   */
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
    },
  },
  // Katalog `public/` bierzemy z głównej aplikacji — favicon jest ten sam.
  publicDir: path.resolve(__dirname, '../../public'),
  // Zmienne czytamy z .env w korzeniu repo, nie z apps/share.
  envDir: path.resolve(__dirname, '../..'),
  server: {
    port: 1430,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist-share'),
    emptyOutDir: true,
    target: 'es2020',
  },
});
