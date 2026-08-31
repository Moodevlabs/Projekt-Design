import { corsHeaders, errorResponse, jsonResponse } from '../_shared/http.ts';
import { adminClient, ownedWorkspace, userClient } from '../_shared/supabase.ts';
import { resendConfigured, sendEmail } from '../_shared/resend.ts';
import {
  renderNotification,
  renderTestEmail,
  type NotificationRow,
} from '../_shared/notification-email.ts';

/**
 * `notify` — opróżnia skrzynkę nadawczą powiadomień (T-116).
 *
 * ## Podział pracy
 *
 * Baza zapisuje ZDARZENIE (migracja 0047: RPC strony klienta odkładają wiersz
 * do `notification_outbox` w tej samej transakcji, w której zapisują
 * akceptację czy uwagę). Ta funkcja zamienia wiersze w maile. Rozdział jest
 * celowy — patrz nagłówek migracji: wysyłka nie może wisieć w transakcji
 * klienta ani jej przewracać.
 *
 * ## Dwie drogi wywołania
 *
 *  * **`drain`** — cyklicznie, z crona (`supabase/snippets/notifications-cron.sql`)
 *    albo ręcznie. Uwierzytelnia się nagłówkiem `x-notify-secret` albo kluczem
 *    `service_role`. **Nie ma tu żadnego wejścia od użytkownika**: funkcja
 *    wysyła to, co leży w kolejce, i nie da się jej kazać wysłać czegokolwiek
 *    innego. To jest istotne, bo `verify_jwt` jest wyłączone.
 *  * **`test`** — z aplikacji, z tokenem zalogowanego. Wysyła jedną wiadomość
 *    testową na adres powiadomień workspace'u. Dzięki niej użytkownik sprawdza
 *    CAŁĄ drogę (klucz, domena, adres, filtr antyspamowy), a nie samą obecność
 *    sekretu w panelu.
 *
 * ## Dlaczego `verify_jwt = false`
 *
 * Cron woła tę funkcję bez użytkownika. Wobec tego autoryzację robimy w środku
 * i osobno dla każdej akcji — `test` bez ważnego tokenu kończy się 401 tak
 * samo, jakby bramka JWT stała przed funkcją.
 */

/** Ile wiadomości bierzemy na jeden przebieg. */
const BATCH = 20;

interface RequestBody {
  action?: string;
  limit?: number;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return errorResponse('Metoda niedozwolona.', 405);

  let body: RequestBody = {};
  try {
    const raw = await request.text();
    body = raw === '' ? {} : (JSON.parse(raw) as RequestBody);
  } catch {
    return errorResponse('Nieczytelne żądanie.', 400);
  }

  const action = body.action ?? 'drain';

  try {
    if (action === 'test') return await handleTest(request);
    if (action === 'drain') return await handleDrain(request, body.limit ?? BATCH);
    return errorResponse('Nieznana akcja.', 400);
  } catch (error) {
    // Kolejka jest odporna na to, że przebieg padł: wiersze zajęte i nie-
    // wysłane wracają do puli po 10 minutach (`claim_notifications`).
    return errorResponse(error instanceof Error ? error.message : 'Błąd wysyłki.', 500);
  }
});

/**
 * Wywołanie „maszynowe": cron albo administrator.
 *
 * Sekret sprawdzamy **porównaniem stałoczasowym**. Zwykłe `===` na stringach
 * kończy pracę na pierwszym różnym znaku, co przy funkcji dostępnej publicznie
 * i wywoływanej w pętli daje pomiar, z którego da się odczytać sekret znak po
 * znaku. Koszt obrony: cztery linie.
 */
function authorizeMachine(request: Request): boolean {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const secret = Deno.env.get('NOTIFY_SECRET') ?? '';

  const header = request.headers.get('x-notify-secret') ?? '';
  if (secret !== '' && header !== '' && timingSafeEqual(header, secret)) return true;

  const auth = request.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return serviceKey !== '' && bearer !== '' && timingSafeEqual(bearer, serviceKey);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handleDrain(request: Request, limit: number): Promise<Response> {
  if (!authorizeMachine(request)) return errorResponse('Brak autoryzacji.', 401);
  if (!resendConfigured()) return errorResponse('Brak RESEND_API_KEY w sekretach funkcji.', 503);

  const admin = adminClient();

  const { data, error } = await admin.rpc('claim_notifications', { p_limit: limit });
  if (error) return errorResponse(`Kolejka: ${error.message}`, 500);

  const rows = (data ?? []) as NotificationRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const email = renderNotification(row);
    const result = await sendEmail({
      to: row.recipient,
      subject: email.subject,
      html: email.html,
      text: email.text,
      // „Odpowiedz" ma wracać do właściciela, a nie do naszej domeny.
      replyTo: row.recipient,
    });

    if (result.ok) {
      sent += 1;
      await admin.rpc('mark_notification_sent', { p_id: row.id });
    } else {
      failed += 1;
      // `mark_notification_failed` sam decyduje, czy wiersz wraca do kolejki,
      // czy zamyka się jako `failed` — reguła prób jest jedna i siedzi w bazie.
      await admin.rpc('mark_notification_failed', {
        p_id: row.id,
        p_error: result.error ?? 'Nieznany błąd.',
      });
    }
  }

  // Sprzątanie przy okazji — tylko wtedy, gdy kolejka i tak była pusta,
  // żeby nie doklejać kasowania do przebiegu, który ma wysłać pocztę.
  if (rows.length === 0) {
    await admin.rpc('prune_notification_outbox');
  }

  return jsonResponse({ claimed: rows.length, sent, failed });
}

/** Wiadomość testowa z ekranu ustawień. */
async function handleTest(request: Request): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return errorResponse('Brak autoryzacji.', 401);

  const supabase = userClient(authHeader);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return errorResponse('Brak autoryzacji.', 401);

  // Test wysyła tylko właściciel: to on płaci i to na jego adres idą
  // powiadomienia. Członek workspace'u (dziś nieistniejący — T-27) nie
  // mógłby w ten sposób wywołać wysyłki na cudzą skrzynkę.
  const workspace = await ownedWorkspace(supabase);
  if (!workspace) return errorResponse('Tylko właściciel workspace może to zrobić.', 403);

  if (!resendConfigured()) return errorResponse('Brak RESEND_API_KEY w sekretach funkcji.', 503);

  const admin = adminClient();
  const { data: recipient, error } = await admin.rpc('notification_recipient', {
    p_workspace_id: workspace.id,
  });
  if (error) return errorResponse(`Adresat: ${error.message}`, 500);

  const to = typeof recipient === 'string' ? recipient.trim() : '';
  if (to === '') return errorResponse('Brak adresu, na który wysłać powiadomienie.', 400);

  const email = renderTestEmail();
  const result = await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: to,
  });

  if (!result.ok) return errorResponse(result.error ?? 'Wysyłka nie powiodła się.', 502);
  return jsonResponse({ ok: true, to });
}
