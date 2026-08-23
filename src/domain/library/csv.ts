import { parseMoney } from '../money';

/**
 * Import macierzy cennika z CSV — tak, jak ludzie trzymają cennik w Excelu.
 *
 * Format: pierwszy wiersz to nagłówek, pierwsza kolumna to nazwa pozycji,
 * kolumny `baza` i `pozostale` są opcjonalne, a wszystkie pozostałe kolumny to
 * **slugi typów pomieszczeń**. Slug, a nie nazwa, bo nazwa bywa poprawiana
 * (patrz `room-types.repo`), a plik ma się zgrać z cennikiem także po roku.
 *
 * ```
 * nazwa;baza;kuchnia;salon;pozostale
 * Projekt budowlany;200;50;40;15
 * ```
 *
 * Parser jest **czysty i tolerancyjny**: rozpoznaje separator, radzi sobie
 * z BOM-em i cudzysłowami z Excela, a wiersze, których nie rozumie, zgłasza
 * jako problemy zamiast przerywać cały import. Użytkownik ma zobaczyć, co się
 * nie wczytało, i wgrać resztę.
 */

/** Nagłówki kolumn spoza macierzy — rozpoznawane bez względu na wielkość liter. */
const NAME_HEADERS = ['nazwa', 'pozycja', 'name'];
const BASE_HEADERS = ['baza', 'base'];
const DEFAULT_HEADERS = ['pozostale', 'pozostałe', 'domyslna', 'domyślna', 'default'];

export interface CsvPricingRow {
  name: string;
  /** `null` = kolumny nie było; nie myl z zerem. */
  baseCents: number | null;
  defaultPerRoomCents: number | null;
  /** Stawki po slugu typu. Puste komórki są pomijane, nie zerowane. */
  perRoomBySlug: Record<string, number>;
}

export interface CsvProblem {
  /** Numer wiersza w pliku, licząc od 1 razem z nagłówkiem — tak jak w Excelu. */
  line: number;
  message: string;
}

export interface CsvPricingImport {
  rows: CsvPricingRow[];
  problems: CsvProblem[];
  /** Slugi z nagłówka, których nie ma w słowniku — do pokazania użytkownikowi. */
  unknownSlugs: string[];
}

/** Excel na polskim locale zapisuje `;`, reszta świata `,`. Zgadujemy z nagłówka. */
function detectSeparator(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ';' : ',';
}

/** Rozbija wiersz na komórki, respektując cudzysłowy (Excel opakowuje nimi teksty z separatorem). */
function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      // `""` wewnątrz cudzysłowu to jeden znak cudzysłowu.
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Parsuje zawartość pliku. `knownSlugs` służy wyłącznie do zgłoszenia, których
 * kolumn nie rozpoznajemy — dane i tak wracają w całości, bo decyzję o tym, co
 * z nimi zrobić, podejmuje warstwa wyżej.
 */
export function parsePricingCsv(content: string, knownSlugs: string[] = []): CsvPricingImport {
  const problems: CsvProblem[] = [];
  // BOM z Excela zjadłby pierwszy nagłówek.
  const clean = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], problems: [{ line: 1, message: 'Plik jest pusty.' }], unknownSlugs: [] };
  }

  const separator = detectSeparator(lines[0]!);
  const header = splitLine(lines[0]!, separator).map(normalizeHeader);

  const nameIndex = header.findIndex((cell) => NAME_HEADERS.includes(cell));
  if (nameIndex === -1) {
    return {
      rows: [],
      problems: [{ line: 1, message: 'Brak kolumny z nazwą pozycji („nazwa”).' }],
      unknownSlugs: [],
    };
  }

  const baseIndex = header.findIndex((cell) => BASE_HEADERS.includes(cell));
  const defaultIndex = header.findIndex((cell) => DEFAULT_HEADERS.includes(cell));

  const slugColumns = header
    .map((cell, index) => ({ slug: cell, index }))
    .filter(
      ({ slug, index }) =>
        slug.length > 0 && index !== nameIndex && index !== baseIndex && index !== defaultIndex,
    );

  const known = new Set(knownSlugs);
  const unknownSlugs = knownSlugs.length
    ? slugColumns.map(({ slug }) => slug).filter((slug) => !known.has(slug))
    : [];

  const rows: CsvPricingRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    const cells = splitLine(line, separator);
    const name = (cells[nameIndex] ?? '').trim();

    if (name === '') {
      problems.push({ line: i + 1, message: 'Wiersz bez nazwy pozycji — pominięty.' });
      continue;
    }

    /** `null` gdy komórki nie ma albo jest pusta; problem gdy jest, ale nie da się jej odczytać. */
    const money = (index: number, label: string): number | null => {
      if (index === -1) return null;
      const raw = (cells[index] ?? '').trim();
      if (raw === '') return null;

      const parsed = parseMoney(raw);
      if (parsed === null) {
        problems.push({ line: i + 1, message: `Nie rozumiem kwoty „${raw}” w kolumnie ${label}.` });
        return null;
      }
      return parsed;
    };

    const perRoomBySlug: Record<string, number> = {};
    for (const { slug, index } of slugColumns) {
      const cents = money(index, slug);
      // Pusta komórka to „bez własnej stawki”, nie „za darmo”. Zapisanie tam
      // zera skasowałoby cennik przy imporcie częściowo wypełnionego arkusza.
      if (cents !== null) perRoomBySlug[slug] = cents;
    }

    rows.push({
      name,
      baseCents: money(baseIndex, 'baza'),
      defaultPerRoomCents: money(defaultIndex, 'pozostałe'),
      perRoomBySlug,
    });
  }

  return { rows, problems, unknownSlugs };
}
