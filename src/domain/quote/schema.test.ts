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

  it('PRZYJMUJE pustą nazwę — to dokument w trakcie pisania, nie uszkodzenie', () => {
    /*
     * Zgłoszenie użytkownika: „Wycena uszkodzona" po skasowaniu nazwy pozycji.
     * Interfejs celowo obsługuje pustą nazwę (placeholder „Nowa pozycja"),
     * więc kasując ją, żeby wpisać od nowa, człowiek na ułamek sekundy ma
     * dokument z pustym polem — i autozapis utrwala go w tym stanie.
     *
     * Wymóg `min(1)` znaczył, że takiego dokumentu NIE DAŁO SIĘ już otworzyć.
     * Odrzucamy zniekształcony KSZTAŁT, a nie niedokończoną TREŚĆ.
     */
    expect(ItemSchema.safeParse({ id: UUID_A, name: '', unitPriceCents: 100 }).success).toBe(true);
  });

  it('nadal odrzuca cenę ułamkową — grosze są liczbą całkowitą', () => {
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
    for (const status of ['draft', 'sent', 'accepted', 'rejected', 'expired', 'archived']) {
      expect(QuoteStatusSchema.parse(status)).toBe(status);
    }
    expect(QuoteStatusSchema.safeParse('nieistniejacy').success).toBe(false);
  });

  it('`archived` to STATUS wersji, a nie kosz', () => {
    // Kosz to `deleted_at` i ma w UI wlasna nazwe („Usun"). Dwa rozne
    // „archiwa" w jednym interfejsie byloby pulapka (T-57).
    expect(QuoteStatusSchema.parse('archived')).toBe('archived');
  });
});

describe('QuoteBodySchema', () => {
  it('z pustego obiektu buduje kompletny dokument', () => {
    const body = QuoteBodySchema.parse({});
    expect(body.title).toBe('Wycena');
    expect(body.client).toEqual({ name: '', phone: '', email: '', city: '' });
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
    // Zły TYP wartości to uszkodzenie kształtu — w odróżnieniu od pustej
    // nazwy, która jest tylko niedokończoną treścią.
    const result = parseQuoteBody({
      sections: [{ id: UUID_A, items: [{ id: UUID_B, unitPriceCents: 'dużo' }] }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('oczekiwano błędu');
    expect(result.error).toContain('sections.0.items.0.unitPriceCents');
  });

  it('dokument z pustymi nazwami pozycji OTWIERA SIĘ', () => {
    // Regresja: dokładnie ten dokument dawał „Wycena uszkodzona".
    const result = parseQuoteBody({
      bodyVersion: 4,
      sections: [
        { id: UUID_A, title: 'Planowanie', items: [{ id: UUID_B, name: '', unitPriceCents: 0 }] },
      ],
    });

    expect(result.ok).toBe(true);
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
