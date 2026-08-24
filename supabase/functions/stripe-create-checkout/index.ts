import {
  corsHeaders,
  errorResponse,
  findPriceId,
  isPlanKey,
  jsonResponse,
  stripeClient,
} from '../_shared/stripe.ts';
import { adminClient, ownedWorkspace, userClient } from '../_shared/supabase.ts';

/**
 * `stripe-create-checkout` — sesja płatności dla zalogowanego właściciela
 * workspace'u (03-BILLING §3).
 *
 * Klient Stripe'a powstaje dopiero tutaj, przy pierwszym zakupie: trial jest
 * nasz i nie wymaga karty, więc do tej chwili nie ma po co zakładać nikogo
 * po tamtej stronie.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('Metoda niedozwolona.', 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return errorResponse('Brak autoryzacji.', 401);

  try {
    const { plan } = (await request.json()) as { plan?: unknown };
    if (!isPlanKey(plan)) return errorResponse('Nieznany plan.', 400);

    const supabase = userClient(authHeader);
    const workspace = await ownedWorkspace(supabase);
    // Płaci właściciel — członek bez tej roli dostaje odmowę, a nie sesję,
    // za którą i tak nie mógłby zapłacić w imieniu firmy.
    if (!workspace) return errorResponse('Tylko właściciel workspace może wykupić plan.', 403);

    const stripe = stripeClient();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id as string | null | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: workspace.email,
        // `workspace_id` w metadanych to jedyny pewny most z powrotem do naszej
        // bazy, gdy webhook przyjdzie bez metadanych sesji.
        metadata: { workspace_id: workspace.id },
      });
      customerId = customer.id;

      /*
       * Zapis MUSI iść przez `service_role`. `subscriptions` ma politykę
       * „członkowie czytają, nikt z klienta nie pisze" (migracja 0004), więc
       * update klientem użytkownika nie rzuca błędem — po prostu nie rusza
       * żadnego wiersza. Efekt: klient Stripe istnieje, a my o nim nie wiemy
       * i przy kolejnym zakupie zakładamy drugiego.
       */
      const { error } = await adminClient()
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('workspace_id', workspace.id);

      if (error) {
        console.error('stripe-create-checkout: nie zapisano stripe_customer_id', error);
        return errorResponse('Nie udało się zapisać danych płatnika.', 500);
      }
    }

    const priceId = await findPriceId(stripe, plan);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'toolier://billing/success',
      cancel_url: 'toolier://billing/cancel',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto' },
      metadata: { workspace_id: workspace.id, plan },
      subscription_data: { metadata: { workspace_id: workspace.id, plan } },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('stripe-create-checkout', error);
    return errorResponse(error instanceof Error ? error.message : 'Nieznany błąd.', 500);
  }
});
