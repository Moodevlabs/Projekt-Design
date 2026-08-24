import { describe, expect, it } from 'vitest';
import {
  priceListFileName,
  quoteFileName,
  scheduleFileName,
  stagesFileName,
} from './file-name';

describe('quoteFileName', () => {
  it('sklada numer i nazwisko klienta', () => {
    expect(quoteFileName('WYC/2026/08/0001', 'Jan Kowalski')).toBe(
      'wyc-2026-08-0001-jan-kowalski.pdf',
    );
  });

  it('zamienia ukosniki z numeru na myslniki', () => {
    // Ukosnik w nazwie pliku to sciezka — zapis by padl albo trafil gdzie indziej.
    expect(quoteFileName('WYC/2026/08/0001', '')).not.toContain('/');
  });

  it('zdejmuje polskie znaki z nazwiska', () => {
    expect(quoteFileName('WYC/1', 'Łukasz Żółć')).toBe('wyc-1-lukasz-zolc.pdf');
  });

  it('wycena bez numeru dostaje sensowna nazwe', () => {
    expect(quoteFileName(null, 'Jan Kowalski')).toBe('wycena-jan-kowalski.pdf');
    expect(quoteFileName(null, '')).toBe('wycena.pdf');
  });

  it('nazwisko z samych znakow specjalnych nie zostawia myslnika na koncu', () => {
    expect(quoteFileName('WYC/1', '???')).toBe('wyc-1.pdf');
  });
});

describe('wersje w nazwie pliku (T-57)', () => {
  it('v1 NIE dostaje przyrostka — to domyslny przypadek', () => {
    expect(quoteFileName('WYC/2026/08/0012', 'Kowalscy', 1)).toBe('wyc-2026-08-0012-kowalscy.pdf');
  });

  it('od v2 przyrostek JEST, zeby pliki sie nie nadpisywaly', () => {
    // Wersja w nazwie jest ZAWSZE, nawet gdy swiadomie nie trafia na sam
    // dokument (`showVersionOnPdf`) — to dwie rozne sprawy.
    expect(quoteFileName('WYC/2026/08/0012', 'Kowalscy', 2)).toBe(
      'wyc-2026-08-0012-kowalscy-v2.pdf',
    );
  });

  it('brak wersji zachowuje sie jak v1 — stare wywolania dzialaja dalej', () => {
    expect(quoteFileName('WYC/2026/08/0012', 'Kowalscy')).toBe('wyc-2026-08-0012-kowalscy.pdf');
  });

  it('dokumenty towarzyszace tez niosa wersje przed swoim przyrostkiem', () => {
    expect(scheduleFileName('WYC/2026/08/0012', 2)).toBe('wyc-2026-08-0012-v2-termin.pdf');
    expect(stagesFileName('WYC/2026/08/0012', 3)).toBe('wyc-2026-08-0012-v3-etapy.pdf');
    expect(priceListFileName('WYC/2026/08/0012', 2)).toBe('wyc-2026-08-0012-v2-cennik.pdf');
  });
});
