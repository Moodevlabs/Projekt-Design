import { describe, expect, it } from 'vitest';

import { buildXlsx } from './xlsx';
import {
  parseSharedStrings,
  parseSheetXml,
  parseWorkbookSheets,
  readZipEntries,
  sheetsToText,
  xlsxToText,
} from './xlsx-text';

describe('parseSharedStrings', () => {
  it('skleja tekst bogaty i rozwija encje', () => {
    const xml = `<sst><si><t>Projekt</t></si><si><r><t>Nadz</t></r><r><t xml:space="preserve">ór &amp; wizja</t></r></si><si><t>&#x142;azienka &#243;</t></si></sst>`;
    expect(parseSharedStrings(xml)).toEqual(['Projekt', 'Nadzór & wizja', 'łazienka ó']);
  });
});

describe('parseSheetXml', () => {
  const shared = ['Usługa', 'Cena', 'Projekt koncepcyjny'];

  it('czyta teksty współdzielone, inline, liczby i wartości logiczne', () => {
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
      <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>1500.5</v></c><c r="C2" t="b"><v>1</v></c></row>
      <row r="3"><c r="A3" t="inlineStr"><is><t>Nadzór</t></is></c><c r="B3" t="str"><v>od 300</v></c></row>
    </sheetData></worksheet>`;

    expect(parseSheetXml(xml, shared)).toEqual([
      ['Usługa', 'Cena'],
      ['Projekt koncepcyjny', '1500.5', 'TAK'],
      ['Nadzór', 'od 300'],
    ]);
  });

  it('zostawia luki między kolumnami i wyrzuca puste wiersze', () => {
    const xml = `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="D1"><v>12</v></c></row>
      <row r="2"><c r="A2" s="3"/><c r="B2"/></row>
      <row r="3"></row>
      <row r="4"><c r="B4"><v>7</v></c><c r="C4"/></row>
    </sheetData></worksheet>`;

    expect(parseSheetXml(xml, shared)).toEqual([
      ['Usługa', '', '', '12'],
      ['', '7'],
    ]);
  });

  it('komórki bez adresu ustawia po kolei', () => {
    const xml = `<row><c><v>1</v></c><c><v>2</v></c></row>`;
    expect(parseSheetXml(xml, [])).toEqual([['1', '2']]);
  });
});

describe('parseWorkbookSheets', () => {
  const files = ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet3.xml'];

  it('idzie po relacjach, nie po numerach plików', () => {
    const workbook = `<workbook><sheets><sheet name="Cennik &amp; rabaty" sheetId="1" r:id="rId2"/><sheet name="Dane" sheetId="2" r:id="rId1"/></sheets></workbook>`;
    const rels = `<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet3.xml"/></Relationships>`;

    expect(parseWorkbookSheets(workbook, rels, files)).toEqual([
      { name: 'Cennik & rabaty', path: 'xl/worksheets/sheet3.xml' },
      { name: 'Dane', path: 'xl/worksheets/sheet1.xml' },
    ]);
  });

  it('bez skoroszytu numeruje pliki po nazwie', () => {
    expect(parseWorkbookSheets(null, null, files)).toEqual([
      { name: 'Arkusz 1', path: 'xl/worksheets/sheet1.xml' },
      { name: 'Arkusz 2', path: 'xl/worksheets/sheet3.xml' },
    ]);
  });
});

describe('sheetsToText', () => {
  it('rozdziela arkusze nagłówkiem i pomija puste', () => {
    const text = sheetsToText([
      {
        name: 'Cennik',
        rows: [
          ['Usługa', 'Cena'],
          ['Projekt', '1500'],
        ],
      },
      { name: 'Pusty', rows: [] },
    ]);
    expect(text).toBe('## Cennik\nUsługa;Cena\nProjekt;1500');
  });
});

describe('xlsxToText (archiwum store z buildXlsx)', () => {
  it('odtwarza arkusz zapisany przez nasz eksporter', async () => {
    const bytes = buildXlsx(
      ['Usługa', 'Cena', 'Uwagi'],
      [
        ['Projekt koncepcyjny', 1500, 'za m²'],
        ['Nadzór autorski', null, 'indywidualnie'],
      ],
      'Cennik',
    );

    const entries = readZipEntries(bytes);
    expect([...entries.keys()]).toContain('xl/worksheets/sheet1.xml');
    expect(entries.get('xl/worksheets/sheet1.xml')?.method).toBe(0);

    await expect(xlsxToText(bytes)).resolves.toBe(
      [
        '## Cennik',
        'Usługa;Cena;Uwagi',
        'Projekt koncepcyjny;1500;za m²',
        'Nadzór autorski;;indywidualnie',
      ].join('\n'),
    );
  });

  it('plik, który nie jest skoroszytem, kończy się błędem', async () => {
    await expect(xlsxToText(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow();
  });
});
