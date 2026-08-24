import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `lookup_key` cen w Stripe (T-66).
 *
 * Klucze żyją w funkcji brzegowej (Deno), której nie da się zaimportować
 * w `pnpm test`. Test czyta plik jako tekst — tak samo jak parytet statusów
 * w `edge-parity.test.ts`.
 *
 * Po co w ogóle test na dwa stringi: zmiana ceny **wymagała nowych obiektów**
 * `price` w Stripe (kwoty istniejącego nie da się edytować), a stare klucze
 * `monthly`/`yearly` nadal wiszą przy cenach 19,99/199. Powrót do nich —
 * przez odwrócony merge albo skopiowany fragment — dałby Checkout ze starą
 * kwotą, czyli błąd, którego nikt nie zobaczy przed pierwszą płatnością.
 */
const EDGE_FILE = resolve(import.meta.dirname, '../../../supabase/functions/_shared/stripe.ts');

const source = readFileSync(EDGE_FILE, 'utf8');

describe('lookup_key cen', () => {
  it('uzywa kluczy z prefiksem `toolier_`', () => {
    expect(source).toContain("monthly: 'toolier_monthly'");
    expect(source).toContain("yearly: 'toolier_yearly'");
  });

  it('NIE odpytuje Stripe po starych kluczach', () => {
    // Przy nich wisza ceny 19,99 / 199 zl — Checkout pokazalby stara kwote.
    expect(source).not.toMatch(/lookup_keys:\s*\[plan\]/);
  });

  it('zapytanie do Stripe idzie po kluczu z mapy, nie po nazwie planu', () => {
    expect(source).toContain('PRICE_LOOKUP_KEYS[plan]');
    expect(source).toContain('lookup_keys: [lookupKey]');
  });
});
