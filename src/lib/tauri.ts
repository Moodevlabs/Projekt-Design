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

/**
 * Sklejenie sciezki po stronie systemu.
 *
 * Recznie wstawiony `/` albo `\` dziala na jednym systemie i psuje sie na
 * drugim — przy zapisie pakietu do wybranego folderu (F6.3) plik trafilby
 * wtedy nie tam, gdzie uzytkownik wskazal.
 */
export async function joinPath(...parts: string[]): Promise<string> {
  const { join } = await import('@tauri-apps/api/path');
  return join(...parts);
}

/**
 * Otwiera adres w **przeglądarce systemowej**.
 *
 * Używane do płatności: Stripe blokuje osadzanie Checkoutu w ramkach, a poza
 * tym przy płaceniu chce się mieć własny menedżer haseł. Lista dozwolonych
 * adresów siedzi w `src-tauri/capabilities/default.json` — próba otwarcia
 * czegokolwiek spoza niej zostanie odrzucona przez Tauri, i tak ma być.
 */
export async function openExternal(url: string): Promise<void> {
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(url);
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

/**
 * Czyta plik z dysku (dialog wyboru albo drag&drop w oknie Tauri).
 *
 * Bajty wraca komenda Rusta, a nie plugin `fs` — dzieki temu nie musimy
 * nadawac aplikacji prawa czytania calego `$HOME`. Ta sama zasada co przy
 * zapisie PDF (`saveFile`).
 */
export async function readFile(path: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>('read_file', { path });
  return Uint8Array.from(bytes);
}

/**
 * Systemowy dialog wyboru plikow. Zwraca sciezki albo pusta liste, gdy
 * uzytkownik zamknal okno — anulowanie nie jest bledem.
 */
export async function openFilesDialog(): Promise<string[]> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const wybrane = await open({ multiple: true });
  if (!wybrane) return [];
  return Array.isArray(wybrane) ? wybrane : [wybrane];
}

/**
 * Upuszczenie plikow na okno.
 *
 * W Tauri webview NIE dostaje zdarzen HTML5 drag&drop dla plikow — przechwytuje
 * je warstwa natywna i oddaje **sciezki** przez `onDragDropEvent`. W przegladarce
 * (`pnpm dev`) jest odwrotnie: sa obiekty `File`, nie ma sciezek. Stad dwie
 * osobne drogi w UI, spiete jednym adapterem.
 *
 * Zwraca funkcje odpinajaca nasluch. Wolaj wylacznie po `runningInTauri()`.
 */
export async function onFilesDropped(
  handler: (paths: string[]) => void,
  onHover?: (hovering: boolean) => void,
): Promise<() => void> {
  const appWindow = getCurrentWindow();

  return appWindow.onDragDropEvent((event) => {
    if (event.payload.type === 'over') {
      onHover?.(true);
      return;
    }
    if (event.payload.type === 'leave') {
      onHover?.(false);
      return;
    }
    if (event.payload.type === 'drop') {
      onHover?.(false);
      handler(event.payload.paths);
    }
  });
}

/** Nazwa pliku ze sciezki systemowej — dziala dla obu separatorow. */
export function fileNameFromPath(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}
