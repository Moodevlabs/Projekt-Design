import { corsHeaders, errorResponse, jsonResponse, stripeClient } from '../_shared/stripe.ts';
import { adminClient, ownedWorkspace, userClient } from '../_shared/supabase.ts';

/** Bucket z logotypami — Storage NIE kasuje się kaskadą z bazy. */
const BRAND_BUCKET = 'brand';

/**
 * `delete-account` — nieodwracalne skasowanie konta i wszystkich danych.
 *
 * Kolejność ma znaczenie i nie jest dowolna:
 *
 *  1. **Najpierw anulujemy subskrypcję w Stripe.** Skasowanie konta bez tego
 *     zostawiłoby aktywne obciążenie karty za usługę, do której nie ma już
 *     dostępu — czyli pobieranie pieniędzy od kogoś, kto odszedł. To najgorszy
 *     możliwy błąd w tej funkcji, więc idzie pierwszy.
 *  2. **Potem pliki ze Storage.** Kaskada `on delete cascade` sprząta tabele,
 *     ale obiektów w buckecie nie rusza — logotypy zostałyby na serwerze po
 *     zniknięciu konta, które je wgrało.
 *  3. **Na końcu użytkownik.** Kasowanie `auth.users` kaskaduje do
 *     `workspaces`, a stamtąd do wszystkiego pozostałego.
 *
 * Gdyby krok 1 albo 2 padł, przerywamy — lepiej zostawić konto do ponownej
 * próby niż skasować dane i stracić możliwość odwołania płatności.
 */
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('Metoda niedozwolona.', 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return errorResponse('Brak autoryzacji.', 401);

  try {
    const supabase = userClient(authHeader);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return errorResponse('Brak autoryzacji.', 401);

    const workspace = await ownedWorkspace(supabase);
    if (!workspace) {
      return errorResponse('Tylko właściciel workspace może usunąć konto.', 403);
    }

    const admin = adminClient();

    // 1. Subskrypcja — anulujemy natychmiast, nie „na koniec okresu".
    // Konto znika teraz, więc opłacony okres nie ma już czego obejmować.
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    const subscriptionId = subscription?.stripe_subscription_id as string | null | undefined;
    if (subscriptionId) {
      const stripe = stripeClient();
      try {
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (error) {
        // Subskrypcja już anulowana po stronie Stripe to nie jest błąd —
        // cel (brak dalszych obciążeń) jest osiągnięty.
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('No such subscription')) {
          console.error('delete-account: anulowanie subskrypcji', error);
          return errorResponse('Nie udało się anulować subskrypcji. Konto nie zostało usunięte.', 502);
        }
      }
    }

    // 2. Pliki brandingu.
    const { data: files } = await admin.storage.from(BRAND_BUCKET).list(workspace.id);
    if (files && files.length > 0) {
      const paths = files.map((file) => `${workspace.id}/${file.name}`);
      const { error: removeError } = await admin.storage.from(BRAND_BUCKET).remove(paths);
      if (removeError) {
        console.error('delete-account: kasowanie plikow', removeError);
        return errorResponse('Nie udało się usunąć plików. Konto nie zostało usunięte.', 500);
      }
    }

    // 3. Użytkownik — kaskada sprząta resztę.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('delete-account: kasowanie uzytkownika', deleteError);
      return errorResponse('Nie udało się usunąć konta.', 500);
    }

    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error('delete-account', error);
    return errorResponse(error instanceof Error ? error.message : 'Nieznany błąd.', 500);
  }
});
