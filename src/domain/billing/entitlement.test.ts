import { describe, expect, it } from 'vitest';
import {
  GRACE_DAYS,
  entitlementFor,
  statusFromStripe,
  type SubscriptionState,
} from './entitlement';

const NOW = new Date('2026-08-22T12:00:00Z');

function at(daysFromNow: number): string {
  return new Date(NOW.getTime() + daysFromNow * 86_400_000).toISOString();
}

function sub(partial: Partial<SubscriptionState> = {}): SubscriptionState {
  return { status: 'active', trialEndsAt: null, currentPeriodEnd: null, ...partial };
}

describe('entitlementFor — trial', () => {
  it('trwajacy trial daje prawo zapisu i liczbe dni', () => {
    const result = entitlementFor(sub({ status: 'trialing', trialEndsAt: at(5) }), NOW);

    expect(result.canWrite).toBe(true);
    expect(result.reason).toBe('trial');
    expect(result.daysLeft).toBe(5);
  });

  it('ostatni dzien triala to wciaz prawo zapisu', () => {
    const result = entitlementFor(
      sub({ status: 'trialing', trialEndsAt: at(0.5) }),
      NOW,
    );
    expect(result.canWrite).toBe(true);
    expect(result.daysLeft).toBe(1);
  });

  it('wygasly trial odbiera prawo zapisu', () => {
    expect(entitlementFor(sub({ status: 'trialing', trialEndsAt: at(-1) }), NOW)).toEqual({
      canWrite: false,
      reason: 'expired',
    });
  });

  it('trial bez daty konca nie daje prawa zapisu', () => {
    // SQL tez tu odmawia: `trial_ends_at is not null and > now()`.
    expect(entitlementFor(sub({ status: 'trialing', trialEndsAt: null }), NOW).canWrite).toBe(
      false,
    );
  });

  it('nieczytelna data traktowana jest jak brak daty', () => {
    expect(
      entitlementFor(sub({ status: 'trialing', trialEndsAt: 'kiedys tam' }), NOW).canWrite,
    ).toBe(false);
  });
});

describe('entitlementFor — abonament', () => {
  it('aktywna subskrypcja daje prawo zapisu', () => {
    expect(entitlementFor(sub({ status: 'active' }), NOW)).toEqual({
      canWrite: true,
      reason: 'active',
    });
  });

  it('`past_due` w oknie laski dalej pozwala pracowac', () => {
    // Nieudana platnosc nie moze z dnia na dzien zablokowac wyceny w toku.
    const result = entitlementFor(
      sub({ status: 'past_due', currentPeriodEnd: at(-(GRACE_DAYS - 1)) }),
      NOW,
    );
    expect(result).toEqual({ canWrite: true, reason: 'grace' });
  });

  it('`past_due` po oknie laski blokuje', () => {
    expect(
      entitlementFor(
        sub({ status: 'past_due', currentPeriodEnd: at(-(GRACE_DAYS + 1)) }),
        NOW,
      ).canWrite,
    ).toBe(false);
  });

  it('`past_due` bez daty okresu blokuje', () => {
    expect(
      entitlementFor(sub({ status: 'past_due', currentPeriodEnd: null }), NOW).canWrite,
    ).toBe(false);
  });

  it('anulowana subskrypcja ma wlasny powod', () => {
    expect(entitlementFor(sub({ status: 'canceled' }), NOW)).toEqual({
      canWrite: false,
      reason: 'canceled',
    });
  });

  it('unpaid, incomplete i paused nie daja prawa zapisu', () => {
    for (const status of ['unpaid', 'incomplete', 'paused'] as const) {
      expect(entitlementFor(sub({ status }), NOW).canWrite).toBe(false);
    }
  });

  it('brak wiersza subskrypcji nie wywala UI', () => {
    // Wiersz zaklada trigger przy rejestracji, wiec jego brak to stan
    // nienormalny — ale aplikacja ma go przezyc.
    expect(entitlementFor(null, NOW)).toEqual({ canWrite: false, reason: 'none' });
  });
});

/**
 * Parytet z `workspace_can_write()` (migracja 0004). Reguly sa dwie — w SQL
 * i tutaj — wiec ten test odtwarza SQL-owy warunek niezaleznie i porownuje.
 * Rozjazd znaczylby, ze UI obiecuje zapis, ktorego baza nie przyjmie.
 */
describe('parytet z SQL `workspace_can_write`', () => {
  /** Dosłowne przełożenie warunku z migracji 0004. */
  function sqlCanWrite(s: SubscriptionState, now: Date): boolean {
    const nowMs = now.getTime();
    const periodEnd = s.currentPeriodEnd ? new Date(s.currentPeriodEnd).getTime() : null;
    const trialEnd = s.trialEndsAt ? new Date(s.trialEndsAt).getTime() : null;

    const statusOk =
      s.status === 'active' ||
      s.status === 'trialing' ||
      (s.status === 'past_due' &&
        periodEnd !== null &&
        !Number.isNaN(periodEnd) &&
        periodEnd > nowMs - GRACE_DAYS * 86_400_000);

    const trialOk =
      s.status !== 'trialing' || (trialEnd !== null && !Number.isNaN(trialEnd) && trialEnd > nowMs);

    return statusOk && trialOk;
  }

  const przypadki: SubscriptionState[] = [
    sub({ status: 'active' }),
    sub({ status: 'trialing', trialEndsAt: at(5) }),
    sub({ status: 'trialing', trialEndsAt: at(-1) }),
    sub({ status: 'trialing', trialEndsAt: null }),
    sub({ status: 'past_due', currentPeriodEnd: at(-1) }),
    sub({ status: 'past_due', currentPeriodEnd: at(-(GRACE_DAYS - 0.1)) }),
    sub({ status: 'past_due', currentPeriodEnd: at(-(GRACE_DAYS + 0.1)) }),
    sub({ status: 'past_due', currentPeriodEnd: null }),
    sub({ status: 'canceled' }),
    sub({ status: 'unpaid' }),
    sub({ status: 'incomplete' }),
    sub({ status: 'paused' }),
    sub({ status: 'active', cancelAtPeriodEnd: true }),
  ];

  it('daje ten sam wynik co warunek z migracji dla wszystkich przypadkow brzegowych', () => {
    for (const przypadek of przypadki) {
      expect({ przypadek, canWrite: entitlementFor(przypadek, NOW).canWrite }).toEqual({
        przypadek,
        canWrite: sqlCanWrite(przypadek, NOW),
      });
    }
  });
});

describe('statusFromStripe', () => {
  it('mapuje statusy Stripe na nasze', () => {
    expect(statusFromStripe('active')).toBe('active');
    expect(statusFromStripe('past_due')).toBe('past_due');
    expect(statusFromStripe('canceled')).toBe('canceled');
    expect(statusFromStripe('unpaid')).toBe('unpaid');
    expect(statusFromStripe('paused')).toBe('paused');
  });

  it('`trialing` ze Stripe to dla nas `active`', () => {
    // Nasz trial jest wlasny i bez karty. Jesli Stripe mowi „trialing”, klient
    // podal karte — ma pelne prawo zapisu.
    expect(statusFromStripe('trialing')).toBe('active');
  });

  it('oba warianty `incomplete` traktujemy tak samo', () => {
    expect(statusFromStripe('incomplete')).toBe('incomplete');
    expect(statusFromStripe('incomplete_expired')).toBe('incomplete');
  });

  it('nieznany status NIE daje dostepu', () => {
    // Pomylka w te strone jest odwracalna, w druga — nie.
    expect(statusFromStripe('cos_nowego_ze_stripe')).toBe('incomplete');
    expect(entitlementFor(sub({ status: statusFromStripe('???') }), NOW).canWrite).toBe(false);
  });
});
