import { describe, expect, it } from 'vitest';
import { quoteFileName } from './file-name';

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
