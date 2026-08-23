import type Stripe from 'https://esm.sh/stripe@17.5.0?target=denonext';
import { stripeClient } from '../_shared/stripe.ts';
import { adminClient } from '../_shared/supabase.ts';
import {
  planFromLookupKey,
  statusFromStripe,
  toIso,
  type SubscriptionStatus,
} from '../_shared/subscription-status.ts';

/**
 * `stripe-webhook` — **źródło prawdy o subskrypcji** (03-BILLING §3).
 *
 * Trzy zasady, których nie wolno tu złamać:
 *  1. **Podpis przed treścią.** Bez weryfikacji każdy mógłby wysłać nam POST-a
 *     i włączyć sobie abonament.
 *  2. **Idempotencja.** Stripe ponawia dostarczenie; ten sam event nie może
 *     zostać przetworzony dwa razy, stąd `stripe_events` z kluczem głównym.
 *  3. **Odpowiadaj 200 szybko.** Błąd naszej bazy nie może kazać Stripe'owi
 *     ponawiać w nieskończoność — logujemy i kwitujemy.
 */
Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Metoda niedozwolona.', { status: 405 });

  const signature = request.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !secret) {
    console.error('stripe-webhook: brak podpisu albo STRIPE_WEBHOOK_SECRET');
    return new Response('Brak podpisu.', { status: 400 });
  }

  const stripe = stripeClient();
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    // `constructEventAsync`, nie `constructEvent`: w Deno kryptografia jest
    // asynchroniczna i wariant synchroniczny rzuca.
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    console.error('stripe-webhook: podpis nie przeszedł', error);
    return new Response('Nieprawidłowy podpis.', { status: 400 });
  }

  const supabase = adminClient();

  /*
   * Idempotencja: pierwszy zapis wygrywa, powtórka odbija się o klucz główny.
   *
   * Rozróżnienie kodu błędu jest tu KONIECZNE. Traktowanie każdego
   * niepowodzenia jako „już przetworzony" znaczy, że pojedynczy problem
   * z bazą (albo literówka w kolumnach) cicho zjada wszystkie webhooki —
   * a Stripe dostaje 200 i nigdy nie ponawia. Złapane testem: brakowało
   * `type`, przez co KAŻDY event wyglądał jak duplikat.
   */
  const { error: insertError } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });

  if (insertError) {
    // 23505 = unique_violation, czyli faktyczna powtórka dostarczenia.
    if (insertError.code === '23505') {
      console.log('stripe-webhook: event już przetworzony', event.id);
      return new Response('ok', { status: 200 });
    }

    // Cokolwiek innego to nasz problem — odpowiadamy 500, żeby Stripe ponowił.
    console.error('stripe-webhook: nie udało się odnotować eventu', insertError);
    return new Response('Błąd zapisu zdarzenia.', { status: 500 });
  }

  try {
    await handleEvent(stripe, supabase, event);
  } catch (error) {
    // Kwitujemy mimo błędu — patrz zasada 3. Event został już odnotowany, więc
    // ponowienie i tak by go pominęło; problem trafia do logów Supabase.
    console.error('stripe-webhook: obsługa eventu nieudana', event.type, error);
  }

  return new Response('ok', { status: 200 });
});

type Admin = ReturnType<typeof adminClient>;

async function handleEvent(stripe: Stripe, supabase: Admin, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription) return;

      const subscription = await stripe.subscriptions.retrieve(String(session.subscription), {
        expand: ['items.data.price'],
      });
      await upsert(supabase, subscription, workspaceIdOf(session, subscription));
      return;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await upsert(supabase, subscription, workspaceIdOf(null, subscription));
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as { subscription?: string | null }).subscription;
      if (!subscriptionId) return;

      // Po fakturze odczytujemy subskrypcję zamiast zgadywać status z typu
      // eventu — Stripe zna prawdę, my tylko ją przepisujemy.
      const subscription = await stripe.subscriptions.retrieve(String(subscriptionId), {
        expand: ['items.data.price'],
      });
      await upsert(supabase, subscription, workspaceIdOf(null, subscription));
      return;
    }

    default:
      console.log('stripe-webhook: pomijam', event.type);
  }
}

/**
 * `workspace_id` z metadanych sesji albo subskrypcji.
 *
 * Ustawiamy je w obu miejscach przy tworzeniu checkoutu właśnie po to, żeby
 * webhook nigdy nie musiał zgadywać, czyja to płatność.
 */
function workspaceIdOf(
  session: Stripe.Checkout.Session | null,
  subscription: Stripe.Subscription,
): string | null {
  return (
    session?.metadata?.workspace_id ??
    subscription.metadata?.workspace_id ??
    (typeof subscription.customer === 'object' && subscription.customer !== null
      ? ((subscription.customer as Stripe.Customer).metadata?.workspace_id ?? null)
      : null)
  );
}

async function upsert(
  supabase: Admin,
  subscription: Stripe.Subscription,
  workspaceId: string | null,
): Promise<void> {
  const price = subscription.items.data[0]?.price;
  const status: SubscriptionStatus = statusFromStripe(subscription.status);

  const row = {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: String(subscription.customer),
    status,
    plan: planFromLookupKey(price?.lookup_key),
    current_period_end: toIso(
      (subscription as { current_period_end?: number }).current_period_end,
    ),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
  };

  if (workspaceId) {
    const { error } = await supabase
      .from('subscriptions')
      .update(row)
      .eq('workspace_id', workspaceId);
    if (error) throw error;
    return;
  }

  // Bez `workspace_id` zostaje jedyny pewny klucz: identyfikator klienta.
  // Wiersz `subscriptions` zawsze istnieje (zakłada go trigger rejestracji),
  // więc to update, nie insert.
  const { error } = await supabase
    .from('subscriptions')
    .update(row)
    .eq('stripe_customer_id', row.stripe_customer_id);
  if (error) throw error;
}
