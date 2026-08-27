import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Widok `projects_overview` musi zwracać wszystko, co ma tabela `projects`.
 *
 * ## Skąd ten test
 *
 * Zakładki „Etapy" w projekcie **nie dało się przeklikać**: klik zapisywał się
 * do tabeli, a etap natychmiast wracał na „Nierozpoczęty". Powód: migracja
 * `0028` dodała kolumnę `stage_progress` do TABELI, ale nie dopisała jej do
 * WIDOKU — a karta projektu czyta widok. Odczyt wracał bez tej kolumny,
 * `parseStageProgress(undefined)` dawało `{}` i wszystko było znowu
 * nierozpoczęte.
 *
 * Błąd przeżył dwa lata migracji i jedno odtworzenie widoku (`0032`), bo przy
 * `drop` + `create` przepisuje się listę kolumn ręcznie — a wtedy najłatwiej
 * powielić brak, którego się nie zauważyło.
 *
 * Ten test czyta SQL, a nie bazę: ma być szybki i działać bez Postgresa.
 */

const KATALOG = path.resolve(__dirname, '../../../supabase/migrations');

function migracje(): string[] {
  return readdirSync(KATALOG)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(path.join(KATALOG, name), 'utf8'));
}

/**
 * Kolumny, które REPOZYTORIUM faktycznie odczytuje z wiersza.
 *
 * To jest właściwa miara, a nie „wszystkie kolumny tabeli": widok wystawia
 * to, czego potrzebuje aplikacja (`created_by` np. nie jest nigdzie czytane
 * i nie musi tam być). Bug polegał na tym, że `stage_progress` było CZYTANE,
 * a w widoku go nie było.
 */
function kolumnyCzytanePrzezRepo(): string[] {
  const repo = readFileSync(path.resolve(__dirname, './projects.repo.ts'), 'utf8');
  const kolumny = new Set<string>();

  const re = /row\.([a-z_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(repo)) !== null) {
    if (m[1]) kolumny.add(m[1]);
  }

  return [...kolumny];
}

/** Ostatnia definicja widoku — tylko ona obowiązuje. */
function ostatniWidok(pliki: string[]): string {
  let ostatnia = '';
  for (const sql of pliki) {
    const re = /create view public\.projects_overview([\s\S]*?);/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) ostatnia = m[0];
  }
  return ostatnia;
}

describe('projects_overview nie moze zgubic kolumny tabeli', () => {
  const pliki = migracje();

  it('test czyta prawdziwe migracje', () => {
    expect(pliki.length).toBeGreaterThan(30);
    expect(ostatniWidok(pliki)).toContain('projects_overview');
  });

  it('widok zwraca stage_progress — bez tego etapow nie da sie przeklikac', () => {
    expect(ostatniWidok(pliki)).toContain('stage_progress');
  });

  it('widok ma KAZDA kolumne, ktora czyta repozytorium', () => {
    const widok = ostatniWidok(pliki);
    const czytane = kolumnyCzytanePrzezRepo();

    // Sanity: gdyby wyrażenie przestało cokolwiek znajdować, test przestałby
    // czegokolwiek pilnować i nikt by tego nie zauważył.
    expect(czytane).toContain('stage_progress');
    expect(czytane.length).toBeGreaterThan(8);

    const brakujace = czytane.filter((kolumna) => !widok.includes(kolumna));
    expect(brakujace).toEqual([]);
  });
});
