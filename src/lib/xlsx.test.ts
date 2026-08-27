import { describe, expect, it } from 'vitest';

import { buildXlsx, columnName } from './xlsx';

const decoder = new TextDecoder();

/**
 * Minimalny, NIEZALEŻNY czytnik ZIP-a.
 *
 * Świadomie nie korzysta z niczego, co jest w `xlsx.ts` — czyta katalog
 * centralny i po offsetach wyciąga zawartość. Gdyby zapis pomylił się
 * o bajt w nagłówku, ten czytnik zwróci śmieci i test się zaczerwieni.
 */
function readZip(data: Uint8Array): Map<string, string> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const files = new Map<string, string>();

  // EOCD: szukamy sygnatury od końca.
  let eocd = -1;
  for (let i = data.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  expect(eocd).toBeGreaterThanOrEqual(0);

  const count = view.getUint16(eocd + 10, true);
  let at = view.getUint32(eocd + 16, true);

  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const nameLength = view.getUint16(at + 28, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(data.subarray(at + 46, at + 46 + nameLength));

    // Nagłówek lokalny — rozmiar i nazwa czytane niezależnie od katalogu.
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const extraLength = view.getUint16(localOffset + 28, true);
    const size = view.getUint32(localOffset + 18, true);
    const start = localOffset + 30 + localNameLength + extraLength;

    files.set(name, decoder.decode(data.subarray(start, start + size)));
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }

  return files;
}

describe('columnName', () => {
  it('liczy kolumny tak jak Excel', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(27)).toBe('AB');
    expect(columnName(51)).toBe('AZ');
    expect(columnName(52)).toBe('BA');
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
  });
});

describe('buildXlsx — struktura pliku', () => {
  const plik = buildXlsx(['Nazwa', 'Kwota'], [['Kowalscy', 1234]]);

  it('zaczyna sie sygnatura ZIP-a', () => {
    expect([...plik.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it('zawiera komplet czesci wymaganych przez Excela', () => {
    const files = readZip(plik);
    expect([...files.keys()].sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  it('tekst idzie jako inlineStr, liczba jako liczba', () => {
    const sheet = readZip(plik).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain(
      '<c r="A2" t="inlineStr"><is><t xml:space="preserve">Kowalscy</t></is></c>',
    );
    // Bez `t="inlineStr"` — inaczej Excel potraktowalby kwote jak tekst
    // i nie dalo by sie jej zsumowac.
    expect(sheet).toContain('<c r="B2"><v>1234</v></c>');
  });
});

describe('buildXlsx — dane, ktore psuja XML', () => {
  it('ampersand i nawiasy nie rozwalaja arkusza', () => {
    const sheet = readZip(buildXlsx(['A'], [['Kowalski & Syn <sp. z o.o.>']])).get(
      'xl/worksheets/sheet1.xml',
    )!;
    expect(sheet).toContain('Kowalski &amp; Syn &lt;sp. z o.o.&gt;');
  });

  it('polskie znaki przezywaja kodowanie', () => {
    const sheet = readZip(buildXlsx(['Miasto'], [['Kraków, Żółkiewskiego']])).get(
      'xl/worksheets/sheet1.xml',
    )!;
    expect(sheet).toContain('Kraków, Żółkiewskiego');
  });

  it('znaki sterujace sa wycinane, a nie wstawiane do XML-a', () => {
    const sheet = readZip(buildXlsx(['A'], [['przedpo']])).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('przedpo');
    expect(sheet).not.toContain('');
  });

  it('pusta komorka jest pusta, a nie zerem', () => {
    const sheet = readZip(buildXlsx(['A', 'B'], [[null, 0]])).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('<c r="A2"/>');
    expect(sheet).toContain('<c r="B2"><v>0</v></c>');
  });
});

describe('buildXlsx — nazwa arkusza', () => {
  it('przycina do 31 znakow i usuwa znaki zakazane przez Excela', () => {
    const workbook = readZip(buildXlsx(['A'], [], 'Rejestr/ofert:2026[wszystko]')).get(
      'xl/workbook.xml',
    )!;
    expect(workbook).toContain('name="Rejestr ofert 2026 wszystko "');
  });

  it('pusta nazwa dostaje wartosc domyslna', () => {
    const workbook = readZip(buildXlsx(['A'], [], '')).get('xl/workbook.xml')!;
    expect(workbook).toContain('name="Arkusz1"');
  });
});

describe('buildXlsx — duze arkusze', () => {
  /**
   * Regresja na `push(...data)`: rozwiniecie tablicy w argumenty przepelnia
   * stos przy kilkudziesieciu tysiacach elementow. Ten arkusz ma ~200 kB.
   */
  it('4000 wierszy nie przepelnia stosu', () => {
    const rows = Array.from({ length: 4000 }, (_, i) => [`Klient ${i}`, i * 100]);
    const plik = buildXlsx(['Nazwa', 'Kwota'], rows);

    expect(plik.length).toBeGreaterThan(100_000);
    const sheet = readZip(plik).get('xl/worksheets/sheet1.xml')!;
    expect(sheet).toContain('Klient 3999');
  });

  it('ten sam wsad daje ten sam plik — bez daty biezacej w srodku', () => {
    const a = buildXlsx(['A'], [['x']]);
    const b = buildXlsx(['A'], [['x']]);
    expect([...a]).toEqual([...b]);
  });
});
