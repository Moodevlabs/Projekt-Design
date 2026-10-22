/**
 * Minimalny ODCZYT XLSX do tekstu — bez zależności (T-136).
 *
 * ## Po co
 *
 * Cennik w Excelu idzie do asystenta AI jako tekst (FEATURES-AI.md §1.1):
 * model nie czyta skoroszytów, a wysyłanie binarki przez funkcję brzegową
 * nic by nie dało. Wystarczy odtworzyć to, co widać w arkuszu — komórki
 * wiersz po wierszu. Formuły, style, scalenia i daty nas nie obchodzą.
 *
 * ## Jak
 *
 * `.xlsx` to ZIP z XML-ami. Czytamy katalog centralny archiwum, wyciągamy
 * `xl/sharedStrings.xml` (teksty współdzielone) i `xl/worksheets/sheet*.xml`
 * (komórki), a nazwy arkuszy bierzemy z `xl/workbook.xml` przez relacje.
 *
 * Wpisy spakowane deflate rozpakowuje `DecompressionStream('deflate-raw')` —
 * WebView2 i WebKit mają je od lat, a to jedyne miejsce, gdzie go używamy.
 * **Dekompresja nie ma testu jednostkowego**: jsdom nie implementuje
 * `DecompressionStream`, a budowanie deflate ręcznie w teście to więcej kodu
 * niż sam czytnik. Testowane są: parsowanie katalogu ZIP (na archiwum
 * `store` z `buildXlsx`), `sharedStrings` i XML arkusza.
 *
 * ## Czym to NIE jest
 *
 * Nie czyta `.xls` (binarny BIFF), nie liczy formuł (bierze zapisany wynik),
 * nie zamienia liczb dat na daty. Gdy arkusz ma same formuły bez cache'u
 * wartości (rzadkie — Excel zapisuje wyniki), komórki wyjdą puste.
 */

const decoder = new TextDecoder('utf-8');

/* ---------------------------------------------------------------------------
 * ZIP — katalog centralny
 * ------------------------------------------------------------------------ */

export interface ZipEntry {
  name: string;
  /** 0 = store, 8 = deflate. Innych metod Excel nie zapisuje. */
  method: number;
  data: Uint8Array;
}

/**
 * Wpisy archiwum po nazwach — dane SUROWE (przed dekompresją).
 *
 * Idziemy od katalogu centralnego, nie po nagłówkach lokalnych: tylko katalog
 * ma wiarygodne rozmiary, gdy pisarz użył deskryptora danych (flaga 3),
 * a tak robi część bibliotek generujących XLSX strumieniowo.
 */
export function readZipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, ZipEntry>();

  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return entries;

  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);

  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.length || view.getUint32(at, true) !== 0x02014b50) break;
    const method = view.getUint16(at + 10, true);
    const compressedSize = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));

    if (localOffset + 30 <= bytes.length && view.getUint32(localOffset, true) === 0x04034b50) {
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      entries.set(name, { name, method, data: bytes.subarray(start, start + compressedSize) });
    }

    at += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflate(entry: ZipEntry): Promise<Uint8Array> {
  if (entry.method === 0) return entry.data;
  if (entry.method !== 8) {
    throw new Error(`Nieobsługiwana metoda kompresji ZIP: ${entry.method}`);
  }
  // Kopia do świeżego bufora: `subarray` dzieli bufor z całym plikiem, a Blob
  // z widokiem o przesunięciu bywa traktowany różnie między silnikami.
  const stream = new Blob([new Uint8Array(entry.data)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ---------------------------------------------------------------------------
 * XML arkusza
 * ------------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith('#')) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return ENTITIES[body] ?? whole;
  });
}

/** Wszystkie `<t>` z fragmentu (tekst bogaty ma ich kilka w `<r>`), sklejone. */
function textRuns(xml: string): string {
  let out = '';
  for (const match of xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) out += decodeXml(match[1] ?? '');
  return out;
}

/** Teksty współdzielone w kolejności indeksów (`<si>`). */
export function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    strings.push(textRuns(match[1] ?? ''));
  }
  return strings;
}

/** Indeks kolumny z adresu komórki: A → 0, Z → 25, AA → 26. `null` bez liter. */
function columnIndex(ref: string): number | null {
  const letters = /^([A-Z]+)/.exec(ref)?.[1];
  if (!letters) return null;
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return match ? match[1]! : null;
}

function cellValue(attrs: string, inner: string, sharedStrings: readonly string[]): string {
  const type = attribute(attrs, 't');
  if (type === 'inlineStr') return textRuns(inner);

  const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1];
  if (raw === undefined) return '';
  const value = decodeXml(raw);

  if (type === 's') return sharedStrings[Number(value)] ?? '';
  if (type === 'b') return value === '1' ? 'TAK' : 'NIE';
  return value;
}

/**
 * Wiersze arkusza jako tablice komórek, ułożone po adresach.
 *
 * Luki między kolumnami zostają pustymi komórkami, żeby „Cena" w kolumnie D
 * nie zsunęła się do B tylko dlatego, że B i C były puste. Wiersze bez
 * żadnej treści odpadają — Excel potrafi zapisać tysiące pustych `<row>`.
 */
export function parseSheetXml(xml: string, sharedStrings: readonly string[]): string[][] {
  const rows: string[][] = [];

  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    let position = 0;

    for (const cell of (rowMatch[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1] ?? '';
      const ref = attribute(attrs, 'r');
      const column = ref ? columnIndex(ref) : null;
      const index = column ?? position;
      while (cells.length < index) cells.push('');
      cells[index] = cellValue(attrs, cell[2] ?? '', sharedStrings).trim();
      position = index + 1;
    }

    while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

/* ---------------------------------------------------------------------------
 * Skoroszyt
 * ------------------------------------------------------------------------ */

interface SheetRef {
  name: string;
  path: string;
}

/**
 * Nazwy arkuszy i ich pliki, w kolejności z `workbook.xml`.
 *
 * Przez relacje, nie po numerze w nazwie pliku: po usunięciu arkusza Excel
 * nie przenumerowuje `sheetN.xml`, więc „Arkusz2" może leżeć w `sheet3.xml`.
 * Gdy brakuje relacji, bierzemy pliki po nazwie — lepsze to niż nic.
 */
export function parseWorkbookSheets(
  workbookXml: string | null,
  relsXml: string | null,
  sheetFiles: readonly string[],
): SheetRef[] {
  const targets = new Map<string, string>();
  if (relsXml) {
    for (const rel of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
      const attrs = rel[1] ?? '';
      const id = attribute(attrs, 'Id');
      const target = attribute(attrs, 'Target');
      if (id && target) {
        const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
        targets.set(id, path);
      }
    }
  }

  const sheets: SheetRef[] = [];
  if (workbookXml) {
    for (const sheet of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
      const attrs = sheet[1] ?? '';
      const name = decodeXml(attribute(attrs, 'name') ?? '');
      const relId = attribute(attrs, 'r:id');
      const path = relId ? targets.get(relId) : undefined;
      if (path && sheetFiles.includes(path)) sheets.push({ name, path });
    }
  }
  if (sheets.length > 0) return sheets;

  return [...sheetFiles]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((path, index) => ({ name: `Arkusz ${index + 1}`, path }));
}

/** Arkusze jako tekst: nagłówek `## nazwa`, wiersz = komórki po `;`. */
export function sheetsToText(sheets: ReadonlyArray<{ name: string; rows: string[][] }>): string {
  return sheets
    .filter((sheet) => sheet.rows.length > 0)
    .map((sheet) => [`## ${sheet.name}`, ...sheet.rows.map((row) => row.join(';'))].join('\n'))
    .join('\n\n');
}

/**
 * Cały skoroszyt jako tekst dla modelu.
 *
 * Rzuca, gdy plik nie jest archiwum ZIP z arkuszem — `.xls` ze zmienionym
 * rozszerzeniem albo uszkodzony plik. Komunikat dla użytkownika składa
 * warstwa wyżej.
 */
export async function xlsxToText(bytes: Uint8Array): Promise<string> {
  const entries = readZipEntries(bytes);
  const sheetFiles = [...entries.keys()].filter((name) =>
    /^xl\/worksheets\/sheet[^/]*\.xml$/.test(name),
  );
  if (sheetFiles.length === 0) throw new Error('To nie jest skoroszyt XLSX.');

  const text = async (name: string): Promise<string | null> => {
    const entry = entries.get(name);
    return entry ? decoder.decode(await inflate(entry)) : null;
  };

  const sharedStrings = parseSharedStrings((await text('xl/sharedStrings.xml')) ?? '');
  const refs = parseWorkbookSheets(
    await text('xl/workbook.xml'),
    await text('xl/_rels/workbook.xml.rels'),
    sheetFiles,
  );

  const sheets: Array<{ name: string; rows: string[][] }> = [];
  for (const ref of refs) {
    const xml = await text(ref.path);
    sheets.push({ name: ref.name, rows: xml ? parseSheetXml(xml, sharedStrings) : [] });
  }

  return sheetsToText(sheets);
}
