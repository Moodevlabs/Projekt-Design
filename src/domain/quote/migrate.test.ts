import { describe, expect, it } from 'vitest';
import {
  CURRENT_BODY_VERSION,
  migrateBody,
  readBodyVersion,
  runMigrations,
  type BodyRecord,
  type MigrationStep,
} from './migrate';
import {
  calcQuoteTotals,
  newGroup,
  newItem,
  newQuoteBody,
  newSection,
  parseQuoteBody,
} from './index';

describe('readBodyVersion', () => {
  it('brak pola to wersja 1 — dokumenty sprzed wersjonowania', () => {
    expect(readBodyVersion({ title: 'Wycena' })).toBe(1);
    expect(readBodyVersion({ bodyVersion: null })).toBe(1);
  });

  it('czyta zapisana wersje', () => {
    expect(readBodyVersion({ bodyVersion: 3 })).toBe(3);
  });

  it('smiec w polu wersji to uszkodzenie, nie domysl', () => {
    // Zgadywanie ksztaltu na podstawie "2.5" albo "dwa" konczy sie gorzej
    // niz odmowa — dokument i tak trafi do `bodyError` z opisem.
    expect(readBodyVersion({ bodyVersion: 'dwa' })).toBeNull();
    expect(readBodyVersion({ bodyVersion: 2.5 })).toBeNull();
    expect(readBodyVersion({ bodyVersion: 0 })).toBeNull();
    expect(readBodyVersion({ bodyVersion: -1 })).toBeNull();
  });
});

/**
 * Mechanizm testujemy na SZTUCZNYM rejestrze, zeby testy nie zaczely padac
 * przy dopisaniu prawdziwej migracji (T-31 doda krok 1→2).
 */
describe('runMigrations — mechanizm', () => {
  const registry: Record<number, MigrationStep> = {
    1: (body) => ({ ...body, rooms: [] }),
    2: (body) => ({ ...body, discounts: [] }),
  };

  it('przepuszcza dokument przez wszystkie brakujace kroki', () => {
    const result = runMigrations({ title: 'Wycena' }, 1, 3, registry);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).toEqual({
      title: 'Wycena',
      rooms: [],
      discounts: [],
      bodyVersion: 3,
    });
  });

  it('rusza od wersji dokumentu, nie od poczatku', () => {
    const result = runMigrations({ title: 'Wycena', rooms: ['juz jest'] }, 2, 3, registry);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Krok 1→2 sie nie wykonal, wiec `rooms` zostalo nietkniete.
    expect((result.body as BodyRecord).rooms).toEqual(['juz jest']);
  });

  it('dokument w biezacej wersji tylko dostaje stempel', () => {
    const result = runMigrations({ title: 'Wycena' }, 3, 3, registry);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body).toEqual({ title: 'Wycena', bodyVersion: 3 });
  });

  it('nie zjada dokumentu, gdy brakuje kroku', () => {
    // Luka w rejestrze to blad programisty. Cicha zgoda znaczylaby zapis
    // dokumentu bez pol, ktorych brakujacy krok mial dodac.
    const result = runMigrations({ title: 'Wycena' }, 1, 3, { 1: registry[1]! });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('2');
  });

  it('nie mutuje wejscia', () => {
    const input: BodyRecord = { title: 'Wycena' };
    runMigrations(input, 1, 3, registry);
    expect(input).toEqual({ title: 'Wycena' });
  });
});

describe('migrateBody', () => {
  it('stare body bez `bodyVersion` przechodzi i dostaje biezaca wersje', () => {
    const result = migrateBody({ title: 'Stara wycena' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.body as BodyRecord).bodyVersion).toBe(CURRENT_BODY_VERSION);
  });

  it('odmawia dokumentu z nowszej wersji aplikacji', () => {
    const result = migrateBody({ title: 'Z przyszlosci', bodyVersion: CURRENT_BODY_VERSION + 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Lepiej powiedziec wprost niz zapisac z powrotem okrojony dokument.
    expect(result.error).toMatch(/nowsz/i);
  });

  it('nie-obiekt zostawia walidacji schematu', () => {
    expect(migrateBody(null)).toEqual({ ok: true, body: null });
    expect(migrateBody('tekst')).toEqual({ ok: true, body: 'tekst' });
  });
});

describe('parseQuoteBody z migracja', () => {
  it('wczytuje wycene sprzed wersjonowania bez zmiany tresci', () => {
    const stara = { ...newQuoteBody({ title: 'Sprzed wersjonowania', validDays: 14 }) };
    delete (stara as Partial<BodyRecord>).bodyVersion;

    const result = parseQuoteBody(stara);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.title).toBe('Sprzed wersjonowania');
    expect(result.body.validDays).toBe(14);
    expect(result.body.bodyVersion).toBe(CURRENT_BODY_VERSION);
  });

  it('migracja do v2 nie rusza kwot starej wyceny', () => {
    // Kryterium T-31: pozycje bez `pricing` dostaja tryb `flat`, czyli
    // dokladnie dotychczasowe `qty × cena`.
    const stara = newQuoteBody({
      vatRate: 23,
      sections: [
        newSection({
          items: [
            newItem({ name: 'Projekt', qty: 2, unitPriceCents: 150_000 }),
            newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 50_000 }),
          ],
        }),
      ],
    });
    const przedMigracja = calcQuoteTotals(stara);

    // Dokument tak, jak lezal w bazie przed v2: bez `bodyVersion` i bez `rooms`.
    const surowy = JSON.parse(JSON.stringify(stara)) as BodyRecord;
    delete surowy.bodyVersion;
    delete surowy.rooms;
    for (const section of surowy.sections as { items: BodyRecord[] }[]) {
      for (const pozycja of section.items) {
        delete pozycja.pricing;
        delete pozycja.roomId;
      }
    }

    const result = parseQuoteBody(surowy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.body.rooms).toEqual([]);
    expect(calcQuoteTotals(result.body)).toEqual(przedMigracja);
  });

  it('rabaty-pozycje przenosza sie do listy rabatow bez zmiany kwoty', () => {
    // v4: rabat przestal byc wierszem wyceny. Migracja nie moze zmienic tego,
    // ile klient placi.
    const stara = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          title: 'Prace',
          items: [
            newItem({ name: 'Projekt', qty: 2, unitPriceCents: 150_000 }),
            newItem({ name: 'Rabat stalego klienta', kind: 'discount', unitPriceCents: 50_000 }),
          ],
          groups: [
            newGroup({
              name: 'Kuchnia',
              items: [newItem({ name: 'Rabat w grupie', kind: 'discount', unitPriceCents: 10_000 })],
            }),
          ],
        }),
      ],
    });
    const przed = calcQuoteTotals(stara);

    const surowy = JSON.parse(JSON.stringify(stara)) as BodyRecord;
    surowy.bodyVersion = 3;
    delete surowy.discounts;

    const result = parseQuoteBody(surowy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Rabaty zniknely z pozycji...
    const pozycje = result.body.sections[0]?.items ?? [];
    expect(pozycje.map((item) => item.name)).toEqual(['Projekt']);
    expect(result.body.sections[0]?.groups[0]?.items).toHaveLength(0);

    // ...i sa na liscie rabatow, z zachowana kwota i nazwa.
    expect(result.body.discounts).toHaveLength(2);
    expect(result.body.discounts[0]).toMatchObject({
      name: 'Rabat stalego klienta',
      type: 'fixed',
      valueCents: 50_000,
      scope: 'quote',
    });

    expect(calcQuoteTotals(result.body).netCents).toBe(przed.netCents);
  });

  it('rabat-pozycja z iloscia przenosi swoja PELNA wartosc', () => {
    // Pozycja-rabat liczyla sie jako `qty × cena`, wiec 3 × 20 zl to 60 zl.
    const stara = newQuoteBody({
      vatRate: 0,
      sections: [
        newSection({
          items: [
            newItem({ name: 'Projekt', unitPriceCents: 100_000 }),
            newItem({ name: 'Rabat', kind: 'discount', qty: 3, unitPriceCents: 2_000 }),
          ],
        }),
      ],
    });

    const surowy = JSON.parse(JSON.stringify(stara)) as BodyRecord;
    surowy.bodyVersion = 3;

    const result = parseQuoteBody(surowy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.discounts[0]?.valueCents).toBe(6_000);
  });

  it('wylaczony rabat-pozycja zostaje wylaczony', () => {
    const stara = newQuoteBody({
      sections: [
        newSection({
          items: [newItem({ name: 'Rabat', kind: 'discount', unitPriceCents: 1_000, enabled: false })],
        }),
      ],
    });

    const surowy = JSON.parse(JSON.stringify(stara)) as BodyRecord;
    surowy.bodyVersion = 3;

    const result = parseQuoteBody(surowy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.discounts[0]?.enabled).toBe(false);
  });

  it('migracja NIE naprawia uszkodzonego dokumentu', () => {
    // `sections` jako tekst to uszkodzenie. Ciche zastapienie go pusta lista
    // wygladaloby dla uzytkownika jak utrata calej wyceny — ma zobaczyc
    // „wycena uszkodzona”, a nie pusty dokument.
    const result = parseQuoteBody({
      bodyVersion: 3,
      title: 'Bez sekcji',
      sections: 'to nie jest tablica',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('sections');
  });

  it('dokument z nowszej wersji ladnie ląduje w `bodyError`', () => {
    const result = parseQuoteBody({
      ...newQuoteBody(),
      bodyVersion: CURRENT_BODY_VERSION + 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Zaktualizuj aplikacje|Zaktualizuj aplikację/);
  });
});
