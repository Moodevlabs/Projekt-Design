import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Uprawnienia Tauri kontra to, czego kod naprawdę używa.
 *
 * Uprawnienia deklarujemy w `src-tauri/capabilities/default.json`, a wywołania
 * siedzą w TypeScripcie — **nic ich ze sobą nie łączy**. Kompilator tego nie
 * zobaczy, testy jednostkowe też nie: wszystko jest zielone, aplikacja się
 * buduje, a funkcja wywala się dopiero pod ręką użytkownika.
 *
 * Tak zginął eksport pakietu do osobnych plików (F6.3): `dialog:allow-save`
 * było na liście, `dialog:allow-open` nie — więc dialog wyboru folderu nie
 * miał prawa się otworzyć. Reszta eksportów działała, bo używa `save`.
 */

const ROOT = join(__dirname, '..', '..');
const CAPABILITIES = join(ROOT, 'src-tauri', 'capabilities', 'default.json');
const SRC = join(ROOT, 'src');

/** Funkcja `plugin-dialog` → uprawnienie, którego wymaga. */
const DIALOG_PERMISSIONS: Record<string, string> = {
  save: 'dialog:allow-save',
  open: 'dialog:allow-open',
  message: 'dialog:allow-message',
  ask: 'dialog:allow-ask',
  confirm: 'dialog:allow-confirm',
};

function plikiZrodlowe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const sciezka = join(dir, entry.name);
    if (entry.isDirectory()) return plikiZrodlowe(sciezka);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [sciezka] : [];
  });
}

function nadaneUprawnienia(): string[] {
  const parsed = JSON.parse(readFileSync(CAPABILITIES, 'utf-8')) as {
    permissions: (string | { identifier: string })[];
  };
  return parsed.permissions.map((p) => (typeof p === 'string' ? p : p.identifier));
}

/**
 * Funkcje `plugin-dialog` wyciągnięte z importów.
 *
 * Wyłapuje `import { save } from '@tauri-apps/plugin-dialog'` i wariant
 * dynamiczny `const { open } = await import('@tauri-apps/plugin-dialog')` —
 * ten drugi jest w tym projekcie regułą, bo dialogi ładujemy leniwie.
 */
function uzyteFunkcjeDialogu(): Map<string, string[]> {
  const wzorzec =
    /(?:import|const)\s*\{([^}]+)\}\s*(?:=\s*await\s*import\(|from\s*)['"]@tauri-apps\/plugin-dialog['"]/g;
  const wynik = new Map<string, string[]>();

  for (const plik of plikiZrodlowe(SRC)) {
    const tresc = readFileSync(plik, 'utf-8');
    for (const dopasowanie of tresc.matchAll(wzorzec)) {
      const funkcje = (dopasowanie[1] ?? '')
        .split(',')
        .map((nazwa) => nazwa.split(' as ')[0]?.trim() ?? '')
        .filter(Boolean);

      for (const funkcja of funkcje) {
        wynik.set(funkcja, [...(wynik.get(funkcja) ?? []), plik.slice(ROOT.length + 1)]);
      }
    }
  }

  return wynik;
}

describe('uprawnienia Tauri pokrywają użycie plugin-dialog', () => {
  it('każdy używany dialog ma swoje uprawnienie', () => {
    const nadane = new Set(nadaneUprawnienia());
    const uzyte = uzyteFunkcjeDialogu();

    // Gdyby regex przestal cokolwiek lapac, test bylby zielony i bezwartosciowy.
    expect(uzyte.size).toBeGreaterThan(0);

    const brakujace = [...uzyte].flatMap(([funkcja, pliki]) => {
      const uprawnienie = DIALOG_PERMISSIONS[funkcja];
      if (!uprawnienie || nadane.has(uprawnienie)) return [];
      return [`${uprawnienie} (uzywane w: ${pliki.join(', ')})`];
    });

    expect(brakujace).toEqual([]);
  });

  it('zna uprawnienie dla każdej używanej funkcji', () => {
    // Nowa funkcja dialogu spoza mapy przeszlaby wyzej niezauwazona.
    const nieznane = [...uzyteFunkcjeDialogu().keys()].filter(
      (funkcja) => !(funkcja in DIALOG_PERMISSIONS),
    );

    expect(nieznane).toEqual([]);
  });

  it('eksport pakietu do osobnych plików wymaga dialogu FOLDERU', () => {
    /*
     * Regresja wprost: tryb „osobne pliki" pyta o folder przez `open`,
     * a nie o nazwe pliku przez `save`. Bez `dialog:allow-open` dziala
     * kazdy inny eksport oprocz tego jednego.
     */
    const zrodlo = readFileSync(join(SRC, 'pdf', 'usePackageExport.tsx'), 'utf-8');
    expect(zrodlo).toContain("import('@tauri-apps/plugin-dialog')");
    expect(zrodlo).toContain('directory: true');
    expect(nadaneUprawnienia()).toContain('dialog:allow-open');
  });
});
