import { getSupabase } from '@/data/supabase';
import { unwrap } from './errors';

/**
 * Pełny zrzut danych workspace'u do pliku JSON.
 *
 * Dwie rzeczy, które łatwo tu zepsuć:
 *
 *  1. **Zrzut idzie z surowych wierszy, nie ze zmapowanych typów.** Nasze
 *     interfejsy (`Quote`, `LibraryItem`…) celowo pomijają kolumny, których UI
 *     nie potrzebuje — a eksport, który gubi kolumny, przestaje być kopią.
 *  2. **Wyceny eksportujemy z `body`.** `listQuotes` zwraca same nagłówki, bo
 *     lista ich nie potrzebuje; zrzut bez `body` byłby spisem tytułów zamiast
 *     kopią pracy.
 *
 * Nie bierzemy identyfikatorów Stripe'a: nie są do niczego potrzebne przy
 * odtwarzaniu danych, a plik ląduje otwartym tekstem na czyimś dysku.
 */
export interface WorkspaceExport {
  /** Wersja formatu — gdyby kiedyś powstał import, będzie po czym poznać. */
  formatVersion: 1;
  exportedAt: string;
  workspace: unknown;
  brandKit: unknown;
  roomTypes: unknown[];
  clients: unknown[];
  projects: unknown[];
  /**
   * **Metadane plików, nie bajty.** Zrzut ma ważyć tyle, co dokumenty, a nie
   * tyle, co archiwum — pliki pobiera się osobno z zakładki „Pliki".
   * Bez tej listy nie dałoby się jednak stwierdzić, co w archiwum było.
   */
  files: unknown[];
  libraryItems: unknown[];
  libraryGroups: unknown[];
  templates: unknown[];
  quotes: unknown[];
}

/** Tabele workspace'u, które składają się na zrzut — kolejność bez znaczenia. */
type ExportedTable =
  | 'brand_kits'
  | 'room_types'
  | 'clients'
  | 'projects'
  | 'files'
  | 'library_items'
  | 'library_groups'
  | 'quote_templates'
  | 'quotes';

export async function exportWorkspaceData(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceExport> {
  const supabase = getSupabase();
  const forWorkspace = (table: ExportedTable) =>
    supabase.from(table).select('*').eq('workspace_id', workspaceId);

  const [
    workspaces,
    brandKits,
    roomTypes,
    clients,
    projects,
    files,
    libraryItems,
    libraryGroups,
    templates,
    quotes,
  ] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', workspaceId),
    forWorkspace('brand_kits'),
    forWorkspace('room_types'),
    forWorkspace('clients'),
    forWorkspace('projects'),
    forWorkspace('files'),
    forWorkspace('library_items'),
    forWorkspace('library_groups'),
    forWorkspace('quote_templates'),
    forWorkspace('quotes'),
  ]);

  return {
    formatVersion: 1,
    exportedAt: now.toISOString(),
    workspace: unwrap(workspaces, 'Eksport: workspace')[0] ?? null,
    brandKit: unwrap(brandKits, 'Eksport: brand kit')[0] ?? null,
    roomTypes: unwrap(roomTypes, 'Eksport: typy pomieszczeń'),
    clients: unwrap(clients, 'Eksport: klienci'),
    projects: unwrap(projects, 'Eksport: projekty'),
    files: unwrap(files, 'Eksport: pliki'),
    libraryItems: unwrap(libraryItems, 'Eksport: biblioteka'),
    libraryGroups: unwrap(libraryGroups, 'Eksport: zestawy'),
    templates: unwrap(templates, 'Eksport: szablony'),
    quotes: unwrap(quotes, 'Eksport: wyceny'),
  };
}

/** Nazwa pliku zrzutu: `toolier-dane-2026-08-23.json`. */
export function exportFileName(now: Date = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  return `toolier-dane-${date}.json`;
}
