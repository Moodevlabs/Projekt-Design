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

/** Ceny szukamy po `lookup_key`, żeby nie trzymać ID w sekretach. */
export type PlanKey = 'pro_monthly' | 'pro_yearly';

export function isPlanKey(value: unknown): value is PlanKey {
  return value === 'pro_monthly' || value === 'pro_yearly';
}

/**
 * Znajduje cenę planu.
 *
 * Kolejność: najpierw zmienna środowiskowa (gdy ktoś chce przypiąć konkretne
 * ID), potem `lookup_key`. Dzięki temu wdrożenie działa bez ustawiania
 * dodatkowych sekretów, a przypięcie ID pozostaje możliwe.
 */
export async function findPriceId(stripe: Stripe, plan: PlanKey): Promise<string> {
  const fromEnv = Deno.env.get(
    plan === 'pro_monthly' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_YEARLY',
  );
  if (fromEnv) return fromEnv;

  const prices = await stripe.prices.list({ lookup_keys: [plan], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) {
    throw new Error(
      `Brak ceny o lookup_key "${plan}" w Stripe. Załóż produkt i ceny (03-BILLING §1).`,
    );
  }
  return price.id;
}

/** Nagłówki CORS — funkcje wołamy z aplikacji, więc preflight musi przejść. */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
