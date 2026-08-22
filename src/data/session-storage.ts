/**
 * Adapter magazynu sesji dla supabase-js.
 *
 * W aplikacji desktopowej refresh token trzymamy w keychainie systemu
 * (Tauri command `secret_*`), a NIE w `localStorage` webview — to główny powód,
 * dla którego w ogóle mamy warstwę Rusta przy autoryzacji.
 *
 * W przeglądarce (`pnpm dev`) nie ma keychaina, więc lecimy na pamięci procesu:
 * sesja przeżywa nawigację po SPA, ale nie przeżywa odświeżenia strony.
 * To celowe — nie chcemy uczyć aplikacji trzymać tokenów w localStorage.
 */
import { runningInTauri, secretDelete, secretGet, secretSet } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';

const log = createLogger('session-storage');

/** Kształt wymagany przez `supabase.auth.storage`. */
export interface SessionStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function createMemoryStorage(): SessionStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(map.get(key) ?? null),
    setItem: (key, value) => {
      map.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      map.delete(key);
      return Promise.resolve();
    },
  };
}

/**
 * Keychain z pamięcią podręczną **przed** nim.
 *
 * Pamięć jest źródłem prawdy dla odczytów, keychain służy wyłącznie do
 * przetrwania restartu. Dwa powody:
 *
 * 1. **Spójność.** Wcześniej zapis awaryjnie lądował w pamięci, ale odczyt
 *    i tak pytał keychain — ten odpowiadał „brak wpisu", więc sesja znikała
 *    tuż po zalogowaniu, a supabase-js wysyłał zapytania jako `anon`.
 *    Teraz cokolwiek zapiszemy, na pewno da się odczytać.
 * 2. **Szybkość.** supabase-js czyta sesję przed żądaniami; każdy odczyt
 *    z keychaina to skok do Rusta i do magazynu poświadczeń systemu.
 */
function createKeychainStorage(): SessionStorage {
  const cache = new Map<string, string | null>();
  let keychainBroken = false;

  const noteFailure = (action: string, error: unknown) => {
    if (!keychainBroken) {
      keychainBroken = true;
      // Logujemy raz — inaczej każdy zapis sesji zasypywałby konsolę.
      log.warn(
        `Keychain niedostępny (${action}). Sesja przetrwa do zamknięcia aplikacji, ale nie restart.`,
        error,
      );
    }
  };

  return {
    async getItem(key) {
      if (cache.has(key)) return cache.get(key) ?? null;

      if (keychainBroken) return null;
      try {
        const value = await secretGet(key);
        cache.set(key, value);
        return value;
      } catch (error) {
        noteFailure('odczyt', error);
        return null;
      }
    },

    async setItem(key, value) {
      // Pamięć najpierw — zapis do keychaina może się nie udać i NIE MOŻE
      // to unieważnić sesji, którą użytkownik właśnie założył.
      cache.set(key, value);
      if (keychainBroken) return;
      try {
        await secretSet(key, value);
      } catch (error) {
        noteFailure('zapis', error);
      }
    },

    async removeItem(key) {
      cache.delete(key);
      try {
        await secretDelete(key);
      } catch (error) {
        noteFailure('kasowanie', error);
      }
    },
  };
}

export function createSessionStorage(): SessionStorage {
  return runningInTauri() ? createKeychainStorage() : createMemoryStorage();
}
