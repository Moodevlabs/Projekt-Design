/**
 * Minimalny zapis XLSX — jeden arkusz, bez zależności (T-23).
 *
 * ## Dlaczego bez biblioteki
 *
 * `.xlsx` to ZIP z kilkoma plikami XML. SheetJS i ExcelJS potrafią sto razy
 * więcej, niż potrzebujemy (formuły, style, wykresy, odczyt), i ważą
 * odpowiednio setki kilobajtów. Tutaj chodzi o jedno: wyeksportować tabelę,
 * którą księgowa otworzy w Excelu. Cała reszta pliku jest stała.
 *
 * ZIP zapisujemy **bez kompresji** (metoda `store`). Deflate wymagałby albo
 * biblioteki, albo `CompressionStream` (asynchroniczne, nierówno wspierane).
 * Eksport rejestru to kilkadziesiąt kilobajtów tekstu — nieskompresowany
 * plik nikogo nie zaboli, a kod zostaje synchroniczny i testowalny.
 *
 * ## Czym to NIE jest
 *
 * Nie czyta XLSX-ów, nie robi stylów, formuł ani wielu arkuszy. Gdyby to
 * kiedyś było potrzebne, wtedy jest moment na bibliotekę — nie teraz.
 */

export type XlsxValue = string | number | null | undefined;

const encoder = new TextEncoder();

/** Nazwa kolumny w stylu A, B… Z, AA, AB… */
export function columnName(index: number): string {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

/**
 * Ucieczka znaków XML.
 *
 * Bez tego jedna nazwa klienta z `&` psuje cały plik: Excel odmawia otwarcia
 * arkusza z niepoprawnym XML-em i nie mówi dlaczego.
 */
function escapeXml(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // Znaki sterujące są w XML 1.0 nielegalne, a trafiają do notatek przez
      // wklejenie z innych programów. Wycinamy je, zamiast psuć plik.
      // nie dopuszcza tych znakow, wiec trzeba je nazwac, zeby je wyciac.
      // eslint-disable-next-line no-control-regex -- o to wlasnie chodzi: XML 1.0
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  );
}

function cellXml(value: XlsxValue, ref: string): string {
  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }

  // `inlineStr` zamiast tablicy `sharedStrings`: jeden plik mniej i żadnego
  // indeksowania. Przy eksporcie liczonym w tysiącach wierszy różnica
  // w rozmiarze jest bez znaczenia.
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

function sheetXml(header: readonly string[], rows: readonly XlsxValue[][]): string {
  const all = [header as readonly XlsxValue[], ...rows];
  const body = all
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => cellXml(value, `${columnName(colIndex)}${rowIndex + 1}`))
        .join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

/* ---------------------------------------------------------------------------
 * ZIP (metoda `store`)
 * ------------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry {
  name: Uint8Array;
  size: number;
  crc: number;
  offset: number;
}

/**
 * Bufor rosnący, do którego dopisujemy bajty.
 *
 * **Nie `array.push(...data)`.** Rozwinięcie tablicy w argumenty przepełnia
 * stos wywołań przy kilkudziesięciu tysiącach elementów — a arkusz rejestru
 * z kilkuset ofertami to setki kilobajtów XML-a. Błąd pojawiłby się dopiero
 * u kogoś z dużą bazą i wyglądał na losowy.
 */
class ByteSink {
  private parts: Uint8Array[] = [];
  length = 0;

  bytes(data: Uint8Array): void {
    this.parts.push(data);
    this.length += data.length;
  }

  u16(value: number): void {
    this.bytes(Uint8Array.from([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.bytes(
      Uint8Array.from([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

/**
 * Składa archiwum ZIP z podanych plików.
 *
 * Daty ustawiamy na stałe (1980-01-01), a nie na „teraz": ten sam eksport ma
 * dawać ten sam plik bajt w bajt, co czyni go porównywalnym w testach. Excel
 * i tak nie pokazuje dat wewnętrznych plików archiwum.
 */
function zip(files: Array<{ name: string; content: string }>): Uint8Array {
  const sink = new ByteSink();
  const entries: Entry[] = [];

  for (const file of files) {
    const data = encoder.encode(file.content);
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(data);
    const offset = sink.length;

    sink.u32(0x04034b50);
    sink.u16(20);
    sink.u16(0);
    sink.u16(0); // store — bez kompresji
    sink.u16(0);
    sink.u16(33); // 1980-01-01
    sink.u32(crc);
    sink.u32(data.length);
    sink.u32(data.length);
    sink.u16(nameBytes.length);
    sink.u16(0);
    sink.bytes(nameBytes);
    sink.bytes(data);

    entries.push({ name: nameBytes, size: data.length, crc, offset });
  }

  const centralStart = sink.length;

  for (const entry of entries) {
    sink.u32(0x02014b50);
    sink.u16(20);
    sink.u16(20);
    sink.u16(0);
    sink.u16(0);
    sink.u16(0);
    sink.u16(33);
    sink.u32(entry.crc);
    sink.u32(entry.size);
    sink.u32(entry.size);
    sink.u16(entry.name.length);
    sink.u16(0);
    sink.u16(0);
    sink.u16(0);
    sink.u16(0);
    sink.u32(0);
    sink.u32(entry.offset);
    sink.bytes(entry.name);
  }

  const centralSize = sink.length - centralStart;

  sink.u32(0x06054b50);
  sink.u16(0);
  sink.u16(0);
  sink.u16(entries.length);
  sink.u16(entries.length);
  sink.u32(centralSize);
  sink.u32(centralStart);
  sink.u16(0);

  return sink.toUint8Array();
}

/**
 * Buduje jednoarkuszowy skoroszyt.
 *
 * `sheetName` jest ograniczony do 31 znaków i bez `[]:*?/\` — Excel odmawia
 * otwarcia pliku z dłuższą albo zawierającą je nazwą, i nie jest to błąd,
 * który da się zdiagnozować z komunikatu.
 */
export function buildXlsx(
  header: readonly string[],
  rows: readonly XlsxValue[][],
  sheetName = 'Arkusz1',
): Uint8Array {
  const safeName = escapeXml(sheetName.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Arkusz1');

  return zip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${safeName}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml(header, rows) },
  ]);
}
