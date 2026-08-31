/**
 * Odpowiedzi HTTP wspólne dla funkcji brzegowych.
 *
 * Wyjęte z `stripe.ts` przy T-116: funkcja `notify` potrzebuje CORS-u i JSON-a,
 * ale nie ma nic wspólnego ze Stripe'em, a import stamtąd ciągnąłby za sobą
 * całe SDK płatności do funkcji, która wysyła maile.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-notify-secret',
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
