/**
 * Mapowanie statusu Stripe → nasz status w `subscriptions`.
 *
 * **To jest kopia `statusFromStripe` z `src/domain/billing/entitlement.ts`.**
 * Duplikat istnieje, bo funkcje brzegowe działają w Deno i nie importują kodu
 * z `src/` (inny runtime, inny bundler). Rozjazd tych dwóch znaczyłby, że
 * webhook zapisuje status, którego aplikacja nie rozumie — dlatego obie listy
 * pilnuje wspólny test (`src/domain/billing/edge-parity.test.ts`), który czyta
 * ten plik i porównuje wynik dla każdego statusu Stripe'a.
 *
 * Zmieniasz tutaj? Zmień tam i odwrotnie.
 */

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'paused';

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
      return 'incomplete';
  }
}

/**
 * Okres rozliczeniowy po cenie — `lookup_key` jest jego identyfikatorem.
 * Nie ma planów w sensie pakietów: aplikacja jest płatna w całości, a wybór
 * dotyczy tylko częstotliwości płatności.
 */
export function planFromLookupKey(lookupKey: string | null | undefined): string | null {
  if (lookupKey === 'monthly' || lookupKey === 'yearly') return lookupKey;
  return null;
}

/** Sekundy uniksowe ze Stripe → ISO dla Postgresa. `null` zostaje `null`. */
export function toIso(unixSeconds: number | null | undefined): string | null {
  if (typeof unixSeconds !== 'number') return null;
  return new Date(unixSeconds * 1000).toISOString();
}
