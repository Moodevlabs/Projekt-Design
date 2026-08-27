import { describe, expect, it } from 'vitest';

import { calcQuoteTotals } from '../quote/calc';
import { newGroup, newItem, newQuoteBody, newSection } from '../quote/factory';
import { parseQuoteBody } from '../quote/schema';
import {
  applyEnabledIds,
  buildShareUrl,
  collectItemIds,
  enabledItemIds,
  expiryFromDays,
  isShareActive,
  selectionDiff,
  shareState,
  tokenFromPath,
  ShareSchema,
  SharedQuotePayloadSchema,
  type Share,
} from './schema';

function share(partial: Partial<Share> = {}): Share {
  return ShareSchema.parse({
    id: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    token: 'abc',
    createdAt: '2026-08-01T10:00:00Z',
    ...partial,
  });
}

describe('ważność linku', () => {
  const teraz = new Date('2026-08-26T12:00:00Z');

  it('link bez daty wygaśnięcia jest ważny', () => {
    expect(isShareActive(share({ expiresAt: null }), teraz)).toBe(true);
    expect(shareState(share({ expiresAt: null }), teraz)).toBe('active');
  });

  it('odwołanie bije wszystko — także link bez terminu', () => {
    const odwolany = share({ expiresAt: null, revokedAt: '2026-08-20T00:00:00Z' });
    expect(isShareActive(odwolany, teraz)).toBe(false);
    expect(shareState(odwolany, teraz)).toBe('revoked');
  });

  it('rozróżnia wygaśnięcie od odwołania — klient dostaje inny komunikat', () => {
    expect(shareState(share({ expiresAt: '2026-08-25T12:00:00Z' }), teraz)).toBe('expired');
    expect(shareState(share({ expiresAt: '2026-08-27T12:00:00Z' }), teraz)).toBe('active');
  });

  it('moment wygaśnięcia liczy się jako wygasły, nie jako ostatnia sekunda ważności', () => {
    expect(shareState(share({ expiresAt: '2026-08-26T12:00:00Z' }), teraz)).toBe('expired');
  });
});

describe('expiryFromDays', () => {
  it('null zostaje nullem — bezterminowo', () => {
    expect(expiryFromDays(null)).toBeNull();
  });

  it('dodaje dni do podanej chwili', () => {
    const wynik = expiryFromDays(30, new Date('2026-08-26T12:00:00Z'));
    expect(wynik?.slice(0, 10)).toBe('2026-09-25');
  });
});

describe('buildShareUrl', () => {
  it('skleja adres bez podwójnego ukośnika', () => {
    expect(buildShareUrl('https://app.toolier.pl/', 'tok')).toBe('https://app.toolier.pl/q/tok');
    expect(buildShareUrl('https://app.toolier.pl', 'tok')).toBe('https://app.toolier.pl/q/tok');
  });

  it('koduje token — base64url nie ma znaków spoza URL, ale nie zakładamy tego', () => {
    expect(buildShareUrl('https://x.pl', 'a/b+c')).toBe('https://x.pl/q/a%2Fb%2Bc');
  });
});

describe('tokenFromPath', () => {
  it('wyciaga token ze sciezki /q/{token}', () => {
    expect(tokenFromPath('/q/abc-123')).toBe('abc-123');
    expect(tokenFromPath('/q/abc-123/')).toBe('abc-123');
  });

  it('dekoduje kodowanie procentowe', () => {
    expect(tokenFromPath('/q/a%2Fb')).toBe('a/b');
  });

  it('adres o innym ksztalcie daje null zamiast pustego tokenu', () => {
    expect(tokenFromPath('/')).toBeNull();
    expect(tokenFromPath('/q/')).toBeNull();
    expect(tokenFromPath('/q')).toBeNull();
    expect(tokenFromPath('/q/a/b')).toBeNull();
    expect(tokenFromPath('/oferta/abc')).toBeNull();
  });

  it('uszkodzone kodowanie nie wywala strony', () => {
    expect(tokenFromPath('/q/%E0%A4%A')).toBeNull();
  });
});

describe('applyEnabledIds', () => {
  const a = newItem({ name: 'Rzuty', unitPriceCents: 100_00, enabled: true });
  const b = newItem({ name: 'Wizualizacje', unitPriceCents: 900_00, enabled: true });
  const c = newItem({ name: 'Nadzór', unitPriceCents: 500_00, enabled: false });

  const body = newQuoteBody({
    vatRate: 0,
    sections: [newSection({ title: 'Etap', items: [a], groups: [newGroup({ items: [b, c] })] })],
  });

  it('sięga do pozycji w grupach, nie tylko luźnych w sekcji', () => {
    const wynik = applyEnabledIds(body, [b.id]);
    const grupa = wynik.sections[0]!.groups[0]!;
    expect(grupa.items[0]!.enabled).toBe(true);
    expect(grupa.items[1]!.enabled).toBe(false);
    expect(wynik.sections[0]!.items[0]!.enabled).toBe(false);
  });

  it('włącza pozycję, którą projektant zostawił wyłączoną — to jest sens listy opcji', () => {
    const wynik = applyEnabledIds(body, [c.id]);
    expect(wynik.sections[0]!.groups[0]!.items[1]!.enabled).toBe(true);
  });

  it('pusta lista wyłącza wszystko', () => {
    const wynik = applyEnabledIds(body, []);
    expect(enabledItemIds(wynik)).toEqual([]);
  });

  it('nie modyfikuje dokumentu wejściowego', () => {
    applyEnabledIds(body, []);
    expect(body.sections[0]!.items[0]!.enabled).toBe(true);
  });

  it('nieznane id są ignorowane, a nie wywalają akceptacji', () => {
    const wynik = applyEnabledIds(body, [a.id, 'id-ktorego-nie-ma']);
    expect(enabledItemIds(wynik)).toEqual([a.id]);
  });

  /**
   * Sedno bezpieczeństwa T-26: kwota akceptacji powstaje z cen SERWERA
   * i wyboru KLIENTA. Gdyby klient odsyłał całe body, ten test nie miałby
   * czego pilnować.
   */
  it('kwota liczy się z cen dokumentu, nie z niczego, co przysłał klient', () => {
    const wybrane = applyEnabledIds(body, [a.id, b.id]);
    expect(calcQuoteTotals(wybrane).netCents).toBe(100_00 + 900_00);

    const samoNadzor = applyEnabledIds(body, [c.id]);
    expect(calcQuoteTotals(samoNadzor).netCents).toBe(500_00);
  });
});

describe('collectItemIds / enabledItemIds', () => {
  it('zwraca id w kolejności dokumentu: luźne pozycje sekcji, potem grupy', () => {
    const a = newItem({ enabled: true });
    const b = newItem({ enabled: false });
    const body = newQuoteBody({
      sections: [newSection({ items: [a], groups: [newGroup({ items: [b] })] })],
    });

    expect(collectItemIds(body)).toEqual([a.id, b.id]);
    expect(enabledItemIds(body)).toEqual([a.id]);
  });
});

describe('selectionDiff', () => {
  const a = newItem({ enabled: true });
  const b = newItem({ enabled: true });
  const c = newItem({ enabled: false });
  const body = newQuoteBody({ sections: [newSection({ items: [a, b, c] })] });

  it('pokazuje, co klient wyłączył i co dobrał', () => {
    const { turnedOff, turnedOn } = selectionDiff(body, [a.id, c.id]);
    expect(turnedOff).toEqual([b.id]);
    expect(turnedOn).toEqual([c.id]);
  });

  it('brak zmian daje puste listy', () => {
    const { turnedOff, turnedOn } = selectionDiff(body, [a.id, b.id]);
    expect(turnedOff).toEqual([]);
    expect(turnedOn).toEqual([]);
  });
});

describe('SharedQuotePayloadSchema', () => {
  it('odmowa parsuje się na wariant z powodem', () => {
    const wynik = SharedQuotePayloadSchema.parse({ ok: false, reason: 'expired' });
    expect(wynik.ok).toBe(false);
    if (!wynik.ok) expect(wynik.reason).toBe('expired');
  });

  it('nieznany powód jest błędem — lepiej pusty ekran niż zmyślony komunikat', () => {
    expect(() => SharedQuotePayloadSchema.parse({ ok: false, reason: 'cokolwiek' })).toThrow();
  });

  it('poprawna odpowiedź niesie dokument gotowy do wyrenderowania', () => {
    const body = newQuoteBody({ title: 'Dom 164 m²' });
    const wynik = SharedQuotePayloadSchema.parse({
      ok: true,
      quote: { number: 'WYC/2026/08/1', title: 'Dom', status: 'sent', currency: 'PLN', body },
      brand: { companyName: 'Studio' },
      share: { expiresAt: null },
      acceptance: null,
    });

    expect(wynik.ok).toBe(true);
    if (wynik.ok) {
      // `body` jest tu celowo `unknown` — schemat go nie waliduje, bo w bazie
      // siedzą też starsze wersje dokumentu (patrz komentarz przy polu).
      // Odbiorca puszcza go przez `parseQuoteBody`.
      const przez_parser = parseQuoteBody(wynik.quote.body);
      expect(przez_parser.ok).toBe(true);
      if (przez_parser.ok) expect(przez_parser.body.title).toBe('Dom 164 m²');
      expect(wynik.brand.accentColor).toBe('#33251E');
    }
  });
});
