import { corsHeaders, errorResponse, jsonResponse, stripeClient } from '../_shared/stripe.ts';
import { ownedWorkspace, userClient } from '../_shared/supabase.ts';

/**
 * `stripe-create-portal` — Customer Portal do zmiany planu, anulowania
 * i faktur (03-BILLING §3).
 *
 * Portal wymaga istniejącego klienta Stripe, więc dla kogoś, kto nigdy nie
 * kupował, zwracamy czytelną odmowę zamiast błędu z API dostawcy.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('Metoda niedozwolona.', 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return errorResponse('Brak autoryzacji.', 401);

  try {
    const supabase = userClient(authHeader);
    const workspace = await ownedWorkspace(supabase);
    if (!workspace) return errorResponse('Tylko właściciel workspace zarządza subskrypcją.', 403);

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    const customerId = subscription?.stripe_customer_id as string | null | undefined;
    if (!customerId) return errorResponse('Nie masz jeszcze subskrypcji do zarządzania.', 400);

    const stripe = stripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'toolier://billing/return',
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('stripe-create-portal', error);
    return errorResponse(error instanceof Error ? error.message : 'Nieznany błąd.', 500);
  }
});
