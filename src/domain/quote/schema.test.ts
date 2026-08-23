import { describe, expect, it } from 'vitest';
import {
  ItemSchema,
  QuoteBodySchema,
  QuoteStatusSchema,
  SectionSchema,
  parseQuoteBody,
} from './schema';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

describe('ItemSchema', () => {
  it('uzupełnia wartości domyślne', () => {
    const item = ItemSchema.parse({ id: UUID_A, name: 'Projekt', unitPriceCents: 15000 });
    expect(item).toEqual({
      id: UUID_A,
      kind: 'item',
      name: 'Projekt',
      description: '',
      qty: 1,
      unitPriceCents: 15000,
      enabled: true,
      libraryItemId: null,
      // Pozycja bez reguły cenowej liczy się jak przed cennikiem
      // parametrycznym — `qty × cena`.
      pricing: { mode: 'flat' },
      roomId: null,
      // Etykiety (F2.3) są opcjonalne — pozycja bez nich to zwykła praca.
      tags: [],
    });
  });

  it('odrzuca pustą nazwę i cenę ułamkową', () => {
    expect(ItemSchema.safeParse({ id: UUID_A, name: '', unitPriceCents: 100 }).success).toBe(false);
    expect(ItemSchema.safeParse({ id: UUID_A, name: 'X', unitPriceCents: 10.5 }).success).toBe(
      false,
    );
  });

  it('odrzuca qty <= 0', () => {
    expect(
      ItemSchema.safeParse({ id: UUID_A, name: 'X', unitPriceCents: 100, qty: 0 }).success,
    ).toBe(false);
  });
});

describe('SectionSchema', () => {
  it('domyślnie ma puste grupy i pozycje', () => {
    expect(SectionSchema.parse({ id: UUID_A })).toEqual({
      id: UUID_A,
      title: '',
      groups: [],
      items: [],
    });
  });
});

describe('QuoteStatusSchema', () => {
  it('akceptuje statusy z bazy', () => {
    for (const status of ['draft', 'sent', 'accepted', 'rejected', 'expired']) {
      expect(QuoteStatusSchema.parse(status)).toBe(status);
    }
    expect(QuoteStatusSchema.safeParse('archived').success).toBe(false);
  });
});

describe('QuoteBodySchema', () => {
  it('z pustego obiektu buduje kompletny dokument', () => {
    const body = QuoteBodySchema.parse({});
    expect(body.title).toBe('Wycena');
    expect(body.client).toEqual({ name: '', phone: '', email: '' });
    expect(body.validDays).toBe(7);
    expect(body.vatRate).toBe(23);
    expect(body.pricesInclude).toBe('net');
    expect(body.sections).toEqual([]);
    expect(body.showDisabledItems).toBe(true);
  });

  it('odrzuca stawkę VAT spoza zakresu 0–100', () => {
    expect(QuoteBodySchema.safeParse({ vatRate: -1 }).success).toBe(false);
    expect(QuoteBodySchema.safeParse({ vatRate: 101 }).success).toBe(false);
  });
});

describe('parseQuoteBody', () => {
  it('zwraca ok dla poprawnego JSON-a z bazy', () => {
    const raw = {
      title: 'Wycena wnętrza',
      sections: [
        {
          id: UUID_A,
          title: 'Projekt',
          items: [{ id: UUID_B, name: 'Koncepcja', unitPriceCents: 250000 }],
        },
      ],
    };
    const result = parseQuoteBody(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.body.sections[0]?.items[0]?.qty).toBe(1);
  });

  it('zwraca opis błędu ze ścieżką dla uszkodzonego dokumentu', () => {
    const result = parseQuoteBody({
      sections: [{ id: UUID_A, items: [{ id: UUID_B, unitPriceCents: 100 }] }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('oczekiwano błędu');
    expect(result.error).toContain('sections.0.items.0.name');
  });

  it('zwraca błąd bez ścieżki dla wejścia, które nie jest obiektem', () => {
    const result = parseQuoteBody(null);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('oczekiwano błędu');
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.error).not.toContain(':');
  });
});

describe('QuoteBodySchema — data wystawienia', () => {
  it('domyslnie jest pusta, zeby UI moglo pokazac created_at', () => {
    const body = QuoteBodySchema.parse({});
    expect(body.issueDate).toBeNull();
  });

  it('przyjmuje date w formacie ISO', () => {
    const body = QuoteBodySchema.parse({ issueDate: '2026-08-22' });
    expect(body.issueDate).toBe('2026-08-22');
  });

  it('odrzuca format polski, zeby do bazy nie trafil niesortowalny string', () => {
    const result = QuoteBodySchema.safeParse({ issueDate: '22.08.2026' });
    expect(result.success).toBe(false);
  });
});
