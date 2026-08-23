import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { statusFromStripe } from './entitlement';

/**
 * Parytet mapowania statusów między aplikacją a funkcją brzegową.
 *
 * `supabase/functions/_shared/subscription-status.ts` to świadoma **kopia**
 * `statusFromStripe` — funkcje brzegowe chodzą w Deno i nie importują kodu
 * z `src/`. Rozjazd znaczyłby, że webhook zapisuje status, którego aplikacja
 * nie rozumie, i użytkownik po opłaceniu dalej widzi tryb tylko do odczytu.
 *
 * Test czyta plik Deno, wyciąga z niego mapowanie i porównuje z domeną — bez
 * uruchamiania Deno, więc działa w zwykłym `pnpm test`.
 */
const EDGE_FILE = resolve(
  import.meta.dirname,
  '../../../supabase/functions/_shared/subscription-status.ts',
);

/** Statusy, które Stripe może przysłać (dokumentacja Stripe Billing). */
const STRIPE_STATUSES = [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
  'incomplete',
  'incomplete_expired',
  'cos_czego_jeszcze_nie_ma',
];

/**
 * Odtwarza `switch` z pliku Deno: zbiera etykiety `case` prowadzące do
 * każdego `return`, żeby porównać mapowanie bez importowania modułu Deno.
 */
function parseEdgeMapping(source: string): { map: Map<string, string>; fallback: string } {
  const body = source.slice(source.indexOf('switch (stripeStatus)'));
  const map = new Map<string, string>();
  let pending: string[] = [];
  let fallback = '';
  let inDefault = false;

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();

    const caseMatch = /^case '([^']+)':$/.exec(line);
    if (caseMatch) {
      pending.push(caseMatch[1]!);
      continue;
    }

    if (line === 'default:') {
      inDefault = true;
      continue;
    }

    const returnMatch = /^return '([^']+)';$/.exec(line);
    if (returnMatch) {
      const value = returnMatch[1]!;
      if (inDefault) {
        fallback = value;
        inDefault = false;
      }
      for (const label of pending) map.set(label, value);
      pending = [];
    }
  }

  return { map, fallback };
}

describe('parytet mapowania statusów: domena ↔ funkcja brzegowa', () => {
  const source = readFileSync(EDGE_FILE, 'utf8');
  const { map, fallback } = parseEdgeMapping(source);

  it('plik funkcji brzegowej da się odczytać i zawiera mapowanie', () => {
    // Gdyby ktoś przeniósł plik albo przepisał `switch` na coś innego, test
    // ma paść tutaj — z czytelnym powodem, a nie na porównaniu pustych map.
    expect(map.size).toBeGreaterThan(5);
    expect(fallback).toBe('incomplete');
  });

  it('każdy status Stripe mapuje się tak samo po obu stronach', () => {
    for (const status of STRIPE_STATUSES) {
      const edge = map.get(status) ?? fallback;
      expect({ status, wynik: edge }).toEqual({ status, wynik: statusFromStripe(status) });
    }
  });

  it('obie strony traktują `trialing` ze Stripe jako `active`', () => {
    // Nasz trial jest własny i bez karty — patrz komentarz w `entitlement.ts`.
    expect(map.get('trialing')).toBe('active');
    expect(statusFromStripe('trialing')).toBe('active');
  });

  it('nieznany status nie daje dostępu po żadnej ze stron', () => {
    expect(fallback).toBe('incomplete');
    expect(statusFromStripe('nieznany')).toBe('incomplete');
  });
});
