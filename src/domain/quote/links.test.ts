import { describe, expect, it } from 'vitest';

import { isSafeHttpUrl, linkDisplayLabel, linkHostLabel, normalizeLinkUrl } from './links';
import { newQuoteBody, newQuoteLink, fromTemplate } from './factory';
import { parseQuoteBody, QuoteBodySchema } from './schema';

describe('normalizeLinkUrl', () => {
  it('dokleja https:// do adresu wpisanego bez schematu', () => {
    expect(normalizeLinkUrl('drive.google.com/drive/folders/abc')).toBe(
      'https://drive.google.com/drive/folders/abc',
    );
  });

  it('zostawia adres, który schemat już ma', () => {
    expect(normalizeLinkUrl('https://we.tl/t-abc')).toBe('https://we.tl/t-abc');
    expect(normalizeLinkUrl('http://przyklad.pl/render')).toBe('http://przyklad.pl/render');
  });

  it('obcina białe znaki dookoła (wklejenie ze spacją na końcu)', () => {
    expect(normalizeLinkUrl('  drive.google.com/x  ')).toBe('https://drive.google.com/x');
  });

  /*
   * To jest sedno tego pliku: adres trafia do `href` na stronie, którą
   * otwiera inwestor. Wszystko poza http/https musi odpaść na wejściu.
   */
  it('odrzuca schematy wykonywalne i lokalne', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('JavaScript:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('file:///C:/render.png')).toBeNull();
    expect(normalizeLinkUrl('data:text/html,<h1>hej</h1>')).toBeNull();
    expect(normalizeLinkUrl('mailto:kto@przyklad.pl')).toBeNull();
  });

  it('odrzuca to, co adresem nie jest', () => {
    expect(normalizeLinkUrl('')).toBeNull();
    expect(normalizeLinkUrl('   ')).toBeNull();
    expect(normalizeLinkUrl('wizualizacje sa na dysku')).toBeNull();
    // Bez kropki w hoście — adres z sieci lokalnej albo literówka.
    expect(normalizeLinkUrl('dysk')).toBeNull();
  });
});

describe('isSafeHttpUrl', () => {
  it('przepuszcza wyłącznie http i https', () => {
    expect(isSafeHttpUrl('https://przyklad.pl')).toBe(true);
    expect(isSafeHttpUrl('http://przyklad.pl')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('nie-adres')).toBe(false);
  });
});

describe('etykiety', () => {
  it('pokazuje host bez www jako podpis adresu', () => {
    expect(linkHostLabel('https://www.drive.google.com/x')).toBe('drive.google.com');
  });

  it('nazwą pustego odnośnika jest jego host', () => {
    expect(linkDisplayLabel({ label: '   ', url: 'https://we.tl/t-abc' })).toBe('we.tl');
    expect(linkDisplayLabel({ label: 'Rendery', url: 'https://we.tl/t-abc' })).toBe('Rendery');
  });
});

describe('links w dokumencie wyceny', () => {
  it('nowy dokument ma pustą listę', () => {
    expect(newQuoteBody().links).toEqual([]);
  });

  /*
   * Pole ma wartość domyślną, więc `bodyVersion` NIE idzie w górę — dokument
   * zapisany przed T-116 musi się czytać dalej. Gdyby ten test padł, znaczy
   * to, że ktoś dołożył migrację i wszystkie stare wyceny wymagają kroku.
   */
  it('dokument sprzed T-116 czyta się i dostaje pustą listę', () => {
    const before = { ...newQuoteBody() } as Record<string, unknown>;
    delete before.links;

    const parsed = parseQuoteBody(before);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.body.links).toEqual([]);
  });

  it('odrzuca dokument z listą ponad limit', () => {
    const body = newQuoteBody({
      links: Array.from({ length: 13 }, () => newQuoteLink({ url: 'https://przyklad.pl' })),
    });
    expect(QuoteBodySchema.safeParse(body).success).toBe(false);
  });

  it('szablon nie przenosi odnośników do nowej wyceny', () => {
    const template = newQuoteBody({
      links: [newQuoteLink({ label: 'Rendery', url: 'https://drive.google.com/x' })],
    });
    expect(fromTemplate(template).links).toEqual([]);
  });

  /*
   * `newQuoteLink` bywa podpięta wprost pod `onClick` — obiekt zdarzenia
   * Reacta rozsypany do dokumentu zabiłby `JSON.stringify` przy zapisie.
   */
  it('fabryka czyta wymienione pola, a nie rozsypuje wejścia', () => {
    const zdarzenie = { label: 'Rendery', target: { nodeName: 'BUTTON' } };
    const link = newQuoteLink(zdarzenie);
    expect(link.label).toBe('Rendery');
    expect(Object.keys(link).sort()).toEqual(['id', 'label', 'note', 'url']);
  });
});
