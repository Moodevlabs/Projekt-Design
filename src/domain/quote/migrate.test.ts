import { describe, expect, it } from 'vitest';
import {
  CURRENT_BODY_VERSION,
  migrateBody,
  readBodyVersion,
  runMigrations,
  type BodyRecord,
  type MigrationStep,
} from './migrate';
import { newQuoteBody, parseQuoteBody } from './index';

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
