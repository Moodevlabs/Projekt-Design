import { describe, expect, it } from 'vitest';

import { pl } from '@/i18n/pl';
import { buildXlsx } from './xlsx';
import {
  AI_FILE_ACCEPT,
  AI_FILE_MAX_BYTES,
  AI_TEXT_MAX_CHARS,
  bytesToBase64,
  decodeText,
  fileExtensionOf,
  fileToAiSource,
  isAiFileSourceError,
  textToAiSource,
} from './ai-file-source';

const encoder = new TextEncoder();

describe('bytesToBase64', () => {
  it('zgadza się z btoa na małych danych', () => {
    const bytes = encoder.encode('Zażółć gęślą jaźń');
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    expect(bytesToBase64(bytes)).toBe(btoa(binary));
  });

  it('skleja porcje bez dopełnienia w środku', () => {
    const bytes = new Uint8Array(3 * 16 * 1024 + 5);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    const encoded = bytesToBase64(bytes);
    expect(encoded.indexOf('=')).toBeGreaterThanOrEqual(encoded.length - 2);
    expect(atob(encoded).length).toBe(bytes.length);
  });

  it('pusta tablica daje pusty string', () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe('');
  });
});

describe('decodeText', () => {
  it('zjada BOM i czyta UTF-8', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...encoder.encode('Usługa;Cena')]);
    expect(decodeText(bytes)).toBe('Usługa;Cena');
  });

  it('czysty ASCII przechodzi bez zmian', () => {
    expect(decodeText(encoder.encode('a;b;c'))).toBe('a;b;c');
  });
});

describe('fileExtensionOf', () => {
  it('bierze ostatni człon po kropce, małymi literami', () => {
    expect(fileExtensionOf('Cennik.2026.PDF')).toBe('pdf');
    expect(fileExtensionOf('bez-rozszerzenia')).toBe('');
  });
});

describe('fileToAiSource', () => {
  it('txt/csv/md → tekst', async () => {
    const result = await fileToAiSource({ name: 'cennik.csv', bytes: encoder.encode('a;b') });
    expect(result).toEqual({ kind: 'text', text: 'a;b' });
  });

  it('pdf → base64', async () => {
    const result = await fileToAiSource({ name: 'oferta.pdf', bytes: encoder.encode('%PDF') });
    expect(result).toEqual({ kind: 'pdf', base64: btoa('%PDF') });
  });

  it('obraz → image z typem MIME', async () => {
    const result = await fileToAiSource({ name: 'zdjecie.JPG', bytes: new Uint8Array([1, 2]) });
    expect(result).toMatchObject({ kind: 'image', mediaType: 'image/jpeg' });
  });

  it('xlsx → tekst arkusza', async () => {
    const bytes = buildXlsx(['Usługa', 'Cena'], [['Projekt', 1500]], 'Cennik');
    const result = await fileToAiSource({ name: 'cennik.xlsx', bytes });
    expect(result).toEqual({ kind: 'text', text: '## Cennik\nUsługa;Cena\nProjekt;1500' });
  });

  it('uszkodzony xlsx → unsupported', async () => {
    const result = await fileToAiSource({ name: 'stary.xlsx', bytes: new Uint8Array([1, 2, 3]) });
    expect(result).toEqual({ error: 'unsupported', ext: 'xlsx' });
  });

  it('docx → osobny powód, zanim sprawdzi rozmiar', async () => {
    const result = await fileToAiSource({ name: 'cennik.docx', bytes: new Uint8Array(1) });
    expect(result).toEqual({ error: 'docx', ext: 'docx' });
    expect(isAiFileSourceError(result)).toBe(true);
  });

  it('za duży plik → too_large', async () => {
    const result = await fileToAiSource({
      name: 'skan.pdf',
      bytes: new Uint8Array(AI_FILE_MAX_BYTES + 1),
    });
    expect(result).toEqual({ error: 'too_large', ext: 'pdf' });
  });

  it('nieznane rozszerzenie → unsupported', async () => {
    const result = await fileToAiSource({ name: 'archiwum.zip', bytes: new Uint8Array(1) });
    expect(result).toEqual({ error: 'unsupported', ext: 'zip' });
  });

  it('tekst ponad limit funkcji → too_long z liczbą znaków, bez przycinania', async () => {
    const text = 'a'.repeat(AI_TEXT_MAX_CHARS + 1);
    const result = await fileToAiSource({ name: 'cennik.txt', bytes: encoder.encode(text) });
    expect(result).toEqual({ error: 'too_long', ext: 'txt', chars: AI_TEXT_MAX_CHARS + 1 });
  });

  it('tekst dokładnie na limicie przechodzi', async () => {
    const text = 'a'.repeat(AI_TEXT_MAX_CHARS);
    const result = await fileToAiSource({ name: 'cennik.csv', bytes: encoder.encode(text) });
    expect(result).toEqual({ kind: 'text', text });
  });

  it('xlsx po konwersji też podlega limitowi znaków', async () => {
    const rows = Array.from({ length: 2000 }, (_, i) => [`Usługa ${i}`, 'x'.repeat(100)]);
    const bytes = buildXlsx(['Usługa', 'Opis'], rows, 'Cennik');
    const result = await fileToAiSource({ name: 'cennik.xlsx', bytes });
    expect(result).toMatchObject({ error: 'too_long', ext: 'xlsx' });
    expect(isAiFileSourceError(result) && result.chars).toBeGreaterThan(AI_TEXT_MAX_CHARS);
  });
});

describe('textToAiSource', () => {
  it('wklejony tekst ponad limit → too_long bez rozszerzenia', () => {
    const result = textToAiSource('x'.repeat(AI_TEXT_MAX_CHARS + 5));
    expect(result).toEqual({ error: 'too_long', ext: '', chars: AI_TEXT_MAX_CHARS + 5 });
  });

  it('limit zgadza się z funkcją brzegową (schemas.ts: max 200 000)', () => {
    expect(AI_TEXT_MAX_CHARS).toBe(200_000);
  });
});

describe('pl.ai.import', () => {
  it('lista formatów pod strefą upuszczania pokrywa się z AI_FILE_ACCEPT', () => {
    const accepted = new Set(AI_FILE_ACCEPT.split(',').map((ext) => ext.replace('.', '')));
    const listed = pl.ai.import.formats.split('·').map((label) => label.trim().toLowerCase());
    expect(listed.length).toBeGreaterThan(0);
    for (const ext of listed)
      expect(accepted.has(ext), `.${ext} nie ma w AI_FILE_ACCEPT`).toBe(true);
  });

  it('komunikat o za długim tekście podaje liczbę znaków i limit', () => {
    const message = pl.ai.import.tooLong(250_000, AI_TEXT_MAX_CHARS);
    expect(message.replace(/\s/g, '')).toContain('250000');
    expect(message.replace(/\s/g, '')).toContain('200000');
  });
});
