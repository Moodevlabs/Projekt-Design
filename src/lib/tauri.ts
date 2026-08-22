/**
 * Cienkie wrappery na `invoke` — reszta aplikacji nie importuje `@tauri-apps/api`
 * bezpośrednio, dzięki czemu `pnpm dev` (przeglądarka) działa z mockiem.
 */
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const runningInTauri = () => isTauri();

/**
 * Przechwytuje zamknięcie okna, żeby zdążyć dokończyć robotę (autozapis wyceny).
 *
 * Zamknięcie wstrzymujemy (`preventDefault`) i domykamy sami przez `destroy()`
 * po wykonaniu `beforeClose`. Nieudany `beforeClose` też zamyka okno: użytkownik
 * kliknął „zamknij" i uwięzienie go w oknie z powodu błędu zapisu byłoby gorsze
 * niż utrata tej jednej zmiany.
 *
 * Zwraca funkcję odpinającą nasłuch. Wołaj wyłącznie po `runningInTauri()`.
 */
export async function onWindowCloseRequested(
  beforeClose: () => Promise<void>,
): Promise<() => void> {
  const appWindow = getCurrentWindow();

  return appWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    try {
      await beforeClose();
    } finally {
      await appWindow.destroy();
    }
  });
}

export async function saveFile(path: string, contents: Uint8Array): Promise<string> {
  return invoke<string>('save_file', { path, contents: Array.from(contents) });
}

export async function openPath(path: string): Promise<void> {
  await invoke('open_path', { path });
}

/* ---------------------------------------------------------------------------
 * Keychain systemowy — trzymamy tam tokeny sesji Supabase.
 * W przeglądarce (`pnpm dev`) te wywołania nie mają sensu; wołaj je tylko
 * po sprawdzeniu `runningInTauri()`.
 * ------------------------------------------------------------------------- */

export async function secretGet(key: string): Promise<string | null> {
  return invoke<string | null>('secret_get', { key });
}

export async function secretSet(key: string, value: string): Promise<void> {
  await invoke('secret_set', { key, value });
}

export async function secretDelete(key: string): Promise<void> {
  await invoke('secret_delete', { key });
}
