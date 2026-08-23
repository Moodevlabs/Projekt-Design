import { describe, expect, it } from 'vitest';
import { registerCsv, registerFileName, REGISTER_HEADER } from './register-csv';
import type { QuoteRegisterRow } from '@/data/repos/quotes.repo';
import { UTF8_BOM } from '@/lib/csv';
import { pl } from '@/i18n/pl';

function wiersz(partial: Partial<QuoteRegisterRow> = {}): QuoteRegisterRow {
  return {
    number: 'WYC/2026/08/0001',
    createdAt: '2026-08-01T10:30:00Z',
    docKind: 'offer',
    clientName: 'Anna Kowalska',
    clientPhone: '600 100 200',
    clientEmail: 'anna@example.com',
    city: 'Kraków',
    internalNotes: null,
    ...partial,
  };
}

function linie(csv: string): string[] {
  return csv.replace(UTF8_BOM, '').trimEnd().split('\r\n');
}

describe('registerCsv — układ arkusza `OFERTY`', () => {
  it('nagłówki są dokładnie w kolejności z arkusza', () => {
    // Ludzie przenoszacy sie z Excela chca dostac z powrotem SWOJ arkusz.
    expect(linie(registerCsv([]))[0]).toBe(
      'LP;DATA;NR OFERTY;RODZAJ;INWESTOR;TELEFON;E-MAIL;MIASTO;NOTATKI',
    );
    expect(REGISTER_HEADER).toHaveLength(9);
  });

  it('wiersz ma tyle kolumn, co nagłówek', () => {
    const [naglowek, dane] = linie(registerCsv([wiersz()]));
    expect(dane?.split(';')).toHaveLength(naglowek?.split(';').length ?? 0);
  });

  it('LP liczy się od jedynki i rośnie', () => {
    const dane = linie(registerCsv([wiersz(), wiersz(), wiersz()])).slice(1);
    expect(dane.map((line) => line.split(';')[0])).toEqual(['1', '2', '3']);
  });

  it('data jest bez godziny — Excel ma ją rozpoznać jako datę', () => {
    expect(linie(registerCsv([wiersz()]))[1]).toContain('2026-08-01');
    expect(linie(registerCsv([wiersz()]))[1]).not.toContain('10:30');
  });

  it('rodzaj dokumentu jest po polsku, nie kluczem bazy', () => {
    const csv = registerCsv([wiersz({ docKind: 'schedule_only' })]);
    expect(csv).toContain(pl.quotes.docKind.schedule_only);
    expect(csv).not.toContain('schedule_only');
  });

  it('telefon i e-mail biorą się z dokumentu', () => {
    const csv = registerCsv([wiersz()]);
    expect(csv).toContain('600 100 200');
    expect(csv).toContain('anna@example.com');
  });

  it('brak numeru, miasta i notatek daje puste komórki, nie „null"', () => {
    const csv = registerCsv([wiersz({ number: null, city: null, internalNotes: null })]);
    expect(csv).not.toContain('null');
  });

  it('polskie znaki przechodzą przez BOM', () => {
    expect(registerCsv([wiersz()]).startsWith(UTF8_BOM)).toBe(true);
    expect(registerCsv([wiersz()])).toContain('Kraków');
  });

  it('wielolinijkowa notatka nie rozsypuje pliku', () => {
    const csv = registerCsv([wiersz({ internalNotes: 'dzwonić\npo 16' })]);
    // Naglowek + jeden wiersz danych; notatka siedzi w cudzyslowie.
    expect(csv).toContain('"dzwonić\npo 16"');
  });

  it('pusty rejestr daje sam nagłówek', () => {
    expect(linie(registerCsv([]))).toHaveLength(1);
  });
});

describe('registerFileName', () => {
  it('ma datę w nazwie', () => {
    expect(registerFileName('2026-08-23T09:00:00Z')).toBe('rejestr-ofert-2026-08-23.csv');
  });
});
