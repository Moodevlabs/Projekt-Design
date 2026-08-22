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

function createKeychainStorage(): SessionStorage {
  // Gdyby keychain był niedostępny (np. Linux bez Secret Service), nie wywalamy
  // aplikacji — schodzimy na pamięć i logujemy. Użytkownik zaloguje się ponownie
  // po restarcie, ale będzie mógł pracować.
  const fallback = createMemoryStorage();

  return {
    async getItem(key) {
      try {
        return await secretGet(key);
      } catch (error) {
        log.warn('Odczyt z keychaina nieudany — używam pamięci', error);
        return fallback.getItem(key);
      }
    },
    async setItem(key, value) {
      try {
        await secretSet(key, value);
      } catch (error) {
        log.warn('Zapis do keychaina nieudany — używam pamięci', error);
        await fallback.setItem(key, value);
      }
    },
    async removeItem(key) {
      try {
        await secretDelete(key);
      } catch (error) {
        log.warn('Kasowanie z keychaina nieudane', error);
      }
      // Zawsze czyścimy też fallback — wylogowanie musi być pewne.
      await fallback.removeItem(key);
    },
  };
}

export function createSessionStorage(): SessionStorage {
  return runningInTauri() ? createKeychainStorage() : createMemoryStorage();
}
