import type { ClientDraft } from './schema';

/**
 * Import klientów z CSV (T-23).
 *
 * ## Zasada: plik pochodzi z Excela klienta, nie od nas
 *
 * Nikt nie będzie przygotowywał pliku pod nasz format. Przychodzi to, co
 * człowiek ma — arkusz z bazą kontaktów, zapisany „jako CSV" w polskim
 * Excelu. Dlatego:
 *
 * - **separator wykrywamy**, a nie zakładamy: Excel PL zapisuje `;`, Excel EN
 *   i Google Sheets `,`, a eksport z niektórych CRM-ów tabulator;
 * - **nagłówki rozpoznajemy po synonimach** i bez polskich znaków — „Nazwa",
 *   „nazwa klienta", „Inwestor", „Klient" mają znaczyć to samo;
 * - **plik bez nagłówka też wchodzi**: pierwsza kolumna to wtedy nazwa.
 *
 * Ten moduł niczego nie zapisuje. Zwraca wiersze i listę problemów —
 * decyzję, co z nimi zrobić, podejmuje interfejs.
 */

export interface ImportIssue {
  /** Numer wiersza w PLIKU (1 = pierwszy wiersz, także nagłówek). */
  line: number;
  reason: 'no_name' | 'duplicate_in_file';
  /** Surowa treść wiersza — żeby człowiek poznał, o który chodzi. */
  raw: string;
}

export interface ImportResult {
  rows: ClientDraft[];
  issues: ImportIssue[];
  /** Czy plik miał wiersz nagłówka (wpływa na numerację w komunikatach). */
  hadHeader: boolean;
  separator: string;
}

const SEPARATORS = [';', ',', '\t'] as const;

/**
 * Wykrywa separator po pierwszym niepustym wierszu.
 *
 * Bierzemy ten, który daje **najwięcej pól** — a nie pierwszy znaleziony.
 * „Kowalski, Jan;500-100-100" ma i przecinek, i średnik; liczy się ten,
 * który faktycznie dzieli kolumny.
 */
export function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== '') ?? '';
  let best = ';';
  let bestCount = 0;

  for (const candidate of SEPARATORS) {
    const count = splitLine(firstLine, candidate).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Dzieli wiersz z uwzględnieniem cudzysłowów (RFC 4180).
 *
 * Bez tego „Kowalski, Jan" w pliku z przecinkami rozpada się na dwie kolumny
 * i cała reszta wiersza przesuwa się o jedno pole.
 */
function splitLine(line: string, separator: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;

    if (inQuotes) {
      if (char === '"') {
        // Podwójny cudzysłów w środku pola to jeden znak `"`.
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      out.push(field);
      field = '';
    } else {
      field += char;
    }
  }

  out.push(field);
  return out;
}

/** Nazwa kolumny bez ogonków, małymi literami — do porównywania nagłówków. */
function normalizeHeader(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ąĄ]/g, 'a')
    .replace(/[ćĆ]/g, 'c')
    .replace(/[ęĘ]/g, 'e')
    .replace(/[łŁ]/g, 'l')
    .replace(/[ńŃ]/g, 'n')
    .replace(/[óÓ]/g, 'o')
    .replace(/[śŚ]/g, 's')
    .replace(/[źŹżŻ]/g, 'z')
    .replace(/[^a-z0-9]/g, '');
}

type Field = keyof ClientDraft;

/**
 * Synonimy nagłówków.
 *
 * Lista jest krótka i celowo pokrywa to, co ludzie naprawdę wpisują —
 * nie próbujemy zgadywać dowolnej nazwy kolumny.
 */
const HEADER_SYNONYMS: Record<string, Field> = {
  nazwa: 'name',
  nazwaklienta: 'name',
  klient: 'name',
  inwestor: 'name',
  imieinazwisko: 'name',
  name: 'name',

  telefon: 'phone',
  tel: 'phone',
  nrtelefonu: 'phone',
  phone: 'phone',
  komorka: 'phone',

  email: 'email',
  mail: 'email',
  adresemail: 'email',
  eemail: 'email',

  miasto: 'city',
  city: 'city',
  miejscowosc: 'city',

  adres: 'address',
  address: 'address',
  adresinwestycji: 'address',
  ulica: 'address',

  notatki: 'notes',
  notatka: 'notes',
  uwagi: 'notes',
  notes: 'notes',
  opis: 'notes',
};

/**
 * Czy pierwszy wiersz to nagłówek.
 *
 * Uznajemy za nagłówek, gdy **co najmniej jedna** komórka pasuje do znanej
 * nazwy kolumny. Warunek „wszystkie muszą pasować" odrzucałby arkusze
 * z dodatkową kolumną, których jest większość.
 */
function looksLikeHeader(cells: readonly string[]): boolean {
  return cells.some((cell) => normalizeHeader(cell) in HEADER_SYNONYMS);
}

function mapColumns(cells: readonly string[]): Array<Field | null> {
  return cells.map((cell) => HEADER_SYNONYMS[normalizeHeader(cell)] ?? null);
}

/** Klucz do wykrywania duplikatów W PLIKU: nazwa + telefon, bez formatowania. */
function duplicateKey(draft: ClientDraft): string {
  const phone = draft.phone.replace(/[^0-9]/g, '');
  return `${draft.name.trim().toLowerCase()}|${phone}`;
}

const EMPTY: ClientDraft = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  notes: '',
  // Import z CSV nie niesie zdjęć — kolumna z adresem pliku nie miałaby
  // sensu, bo plik i tak musi trafić do Storage.
  avatarPath: null,
};

/**
 * Parsuje zawartość pliku CSV na listę klientów do dodania.
 *
 * Nie odrzuca całego pliku z powodu jednego złego wiersza: wiersze bez nazwy
 * i powtórzone trafiają do `issues`, reszta do `rows`. Import, który wykłada
 * się na 300 kontaktach, bo w 47. brakuje nazwiska, jest bezużyteczny.
 */
export function parseClientsCsv(content: string): ImportResult {
  // BOM z Excela zjadłby pierwszy nagłówek: znak U+FEFF sklejony z `Nazwa`
  // to nie jest `Nazwa`.
  // Zapisany jako sekwencja ucieczki, bo literalny BOM w kodzie jest niewidoczny
  // i pierwszy `prettier --write` może go po cichu zgubić.
  const text = content.replace(/^\uFEFF/, '');
  const separator = detectSeparator(text);
  const lines = text.split(/\r?\n/);

  const rows: ClientDraft[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  let columns: Array<Field | null> | null = null;
  let hadHeader = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    if (line.trim() === '') continue;

    const cells = splitLine(line, separator).map((cell) => cell.trim());

    if (columns === null) {
      if (looksLikeHeader(cells)) {
        columns = mapColumns(cells);
        hadHeader = true;
        continue;
      }
      // Plik bez nagłówka: zakładamy kolejność z naszego eksportu i tak
      // czy owak wymagamy tylko nazwy.
      columns = ['name', 'phone', 'email', 'city', 'address', 'notes'];
    }

    const draft: ClientDraft = { ...EMPTY };
    for (let column = 0; column < cells.length; column++) {
      const field = columns[column];
      if (!field) continue;
      draft[field] = cells[column] ?? '';
    }

    if (draft.name === '') {
      issues.push({ line: index + 1, reason: 'no_name', raw: line });
      continue;
    }

    const key = duplicateKey(draft);
    if (seen.has(key)) {
      issues.push({ line: index + 1, reason: 'duplicate_in_file', raw: line });
      continue;
    }
    seen.add(key);
    rows.push(draft);
  }

  return { rows, issues, hadHeader, separator };
}
