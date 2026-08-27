/**
 * Prawo zapisu w workspace — **czysta funkcja, parytet z `workspace_can_write()`
 * w SQL** (migracja 0004).
 *
 * Dwie implementacje tej samej reguły istnieją nie z lenistwa: RLS jest twardą
 * granicą (nawet obejście UI nie zapisze), a ta funkcja pozwala pokazać powód
 * i licznik dni **zanim** użytkownik kliknie i dostanie enigmatyczny błąd.
 * Rozjazd między nimi znaczyłby, że aplikacja obiecuje zapis, którego baza nie
 * przyjmie — dlatego pilnuje ich wspólny test na przypadkach brzegowych.
 */

export type SubscriptionStatus =
  'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'paused';

/** Wiersz `subscriptions` w kształcie, jakiego potrzebuje reguła. */
export interface SubscriptionState {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd?: boolean;
}

export type EntitlementReason = 'trial' | 'active' | 'grace' | 'expired' | 'canceled' | 'none';

export interface Entitlement {
  canWrite: boolean;
  reason: EntitlementReason;
  /** Dni do końca triala — tylko dla `reason: 'trial'`. Zaokrąglone w górę. */
  daysLeft?: number;
}

/** Okno łaski po nieudanej płatności — ta sama wartość co `interval '7 days'` w SQL. */
export const GRACE_DAYS = 7;

const DAY_MS = 86_400_000;

function parse(value: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Czy workspace może zapisywać i dlaczego.
 *
 * Kolejność sprawdzeń odpowiada SQL-owi: trial liczy się tylko, dopóki trwa;
 * `past_due` dostaje 7 dni od końca okresu rozliczeniowego; wszystko inne
 * (canceled, unpaid, incomplete, paused) to brak prawa zapisu.
 */
export function entitlementFor(
  subscription: SubscriptionState | null,
  now: Date = new Date(),
): Entitlement {
  // Brak wiersza to stan nienormalny (zakłada go trigger przy rejestracji),
  // ale UI nie może się na nim wywrócić — traktujemy jak brak licencji.
  if (!subscription) return { canWrite: false, reason: 'none' };

  const nowMs = now.getTime();

  if (subscription.status === 'trialing') {
    const trialEnd = parse(subscription.trialEndsAt);
    if (trialEnd !== null && trialEnd > nowMs) {
      return {
        canWrite: true,
        reason: 'trial',
        daysLeft: Math.ceil((trialEnd - nowMs) / DAY_MS),
      };
    }
    // Trial bez daty albo już wygasły — SQL też tu odmawia.
    return { canWrite: false, reason: 'expired' };
  }

  if (subscription.status === 'active') {
    return { canWrite: true, reason: 'active' };
  }

  if (subscription.status === 'past_due') {
    const periodEnd = parse(subscription.currentPeriodEnd);
    if (periodEnd !== null && periodEnd > nowMs - GRACE_DAYS * DAY_MS) {
      return { canWrite: true, reason: 'grace' };
    }
    return { canWrite: false, reason: 'expired' };
  }

  if (subscription.status === 'canceled') {
    return { canWrite: false, reason: 'canceled' };
  }

  return { canWrite: false, reason: 'expired' };
}

/**
 * Mapowanie statusu ze Stripe na nasz.
 *
 * Stripe ma własny `trialing`, ale **my go nie używamy**: trial jest nasz,
 * nadawany przy rejestracji bez karty. Subskrypcja ze Stripe w stanie
 * `trialing` (gdyby ktoś włączył trial po stronie Stripe) jest dla nas
 * `active` — klient podał kartę, więc ma pełne prawo zapisu.
 */
export function statusFromStripe(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'paused';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      // Nieznany status ze Stripe traktujemy jak brak opłacenia, a nie jak
      // dostęp — pomyłka w tę stronę jest odwracalna, w drugą nie.
      return 'incomplete';
  }
}
