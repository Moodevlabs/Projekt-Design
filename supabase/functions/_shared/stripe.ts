import Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';

/**
 * Wspólne kawałki trzech funkcji Stripe'owych.
 *
 * Klient tworzony jest z `Deno.env`, a nie przekazywany — dzięki temu żadna
 * z funkcji nie może przypadkiem wystartować bez klucza i odkryć tego dopiero
 * przy pierwszym wywołaniu Stripe'a.
 */

export function stripeClient(): Stripe {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Brak STRIPE_SECRET_KEY w sekretach funkcji.');

  return new Stripe(key, {
    apiVersion: '2024-12-18.acacia',
    // Deno nie ma wbudowanego HTTP klienta Stripe'a — bez tego SDK próbuje
    // użyć modułu `http` z Node'a i wywala się przy starcie.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Okres rozliczeniowy. **Nie ma planów ani wersji darmowej** — aplikacja jest
 * płatna, a wybór dotyczy wyłącznie tego, czy klient płaci co miesiąc, czy raz
 * w roku. Stąd `monthly`/`yearly`, a nie `pro_*`.
 *
 * Ceny szukamy po `lookup_key`, żeby nie trzymać ID w sekretach.
 */
export type PlanKey = 'monthly' | 'yearly';

export function isPlanKey(value: unknown): value is PlanKey {
  return value === 'monthly' || value === 'yearly';
}

/**
 * `lookup_key` cen w Stripe (T-66).
 *
 * Prefiks `toolier_` jest **częścią zmiany ceny**, nie kosmetyką: Stripe nie
 * pozwala edytować kwoty istniejącego `price`, więc 98,99 / 999,99 zł to nowe
 * obiekty. Gdyby nosiły stare klucze `monthly` / `yearly`, trzeba by najpierw
 * zdjąć klucz ze starej ceny — a wtedy przez chwilę żadna cena by się nie
 * znalazła i Checkout by padł. Nowe klucze pozwalają wdrożyć jedno po drugim.
 */
export const PRICE_LOOKUP_KEYS: Record<PlanKey, string> = {
  monthly: 'toolier_monthly',
  yearly: 'toolier_yearly',
};

/**
 * Znajduje cenę planu.
 *
 * Kolejność: najpierw zmienna środowiskowa (gdy ktoś chce przypiąć konkretne
 * ID), potem `lookup_key`. Dzięki temu wdrożenie działa bez ustawiania
 * dodatkowych sekretów, a przypięcie ID pozostaje możliwe.
 */
export async function findPriceId(stripe: Stripe, plan: PlanKey): Promise<string> {
  const fromEnv = Deno.env.get(
    plan === 'monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_YEARLY',
  );
  if (fromEnv) return fromEnv;

  const lookupKey = PRICE_LOOKUP_KEYS[plan];
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `Brak ceny o lookup_key "${lookupKey}" w Stripe. Załóż produkt i ceny (03-BILLING §1).`,
    );
  }
  return price.id;
}

/** Nagłówki CORS — funkcje wołamy z aplikacji, więc preflight musi przejść. */
/*
 * Odpowiedzi HTTP przeniosły się do `_shared/http.ts` (T-116) — funkcja
 * `notify` używa ich, nie mając nic wspólnego ze Stripe'em. Re-eksport
 * zostaje, żeby trzy funkcje płatności nie musiały zmieniać importów.
 */
export { corsHeaders, errorResponse, jsonResponse } from './http.ts';
