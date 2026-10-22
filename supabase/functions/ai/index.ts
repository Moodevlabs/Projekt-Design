import { corsHeaders, jsonResponse } from '../_shared/http.ts';
import { adminClient, ownedWorkspace, userClient } from '../_shared/supabase.ts';
import { runStructured } from '../_shared/anthropic.ts';
import { ACTIONS, isActionName } from './actions/index.ts';

/**
 * `ai` — asystent AI Toolier (FEATURES-AI.md §1.1).
 *
 * ## Co tu się dzieje, w kolejności
 *
 *  1. Token użytkownika → workspace, którego jest właścicielem.
 *  2. `workspace_can_write` — asystent jest częścią płatnej aplikacji; w trybie
 *     tylko do odczytu (po trialu, po nieopłaceniu) nie działa, tak jak zapis.
 *  3. Limit miesięczny z `ai_usage` (`AI_MONTHLY_LIMIT`, domyślnie 300).
 *  4. Walidacja ładunku schematem akcji — model NIGDY nie dostaje surowego
 *     ciała żądania, tylko to, co schemat przepuścił.
 *  5. Wywołanie modelu z wymuszonym JSON-em; odmowa i zły kształt to kody
 *     błędów, nie wyjątki.
 *  6. Zapis zużycia (service role — użytkownik nie ma INSERT-u na `ai_usage`).
 *
 * ## Klucz modelu
 *
 * `ANTHROPIC_API_KEY` żyje tylko tutaj (CLAUDE.md §10). Aplikacja nie zna go
 * i nie woła Anthropic bezpośrednio.
 *
 * ## Odpowiedzi
 *
 * Sukces: `{ ok: true, data, usage }`. Błąd: `{ ok: false, error, code, … }`
 * z kodem HTTP, który `ai.repo.ts` mapuje na `AiError`. Kody w `AI_ERROR_CODES`.
 */

const DEFAULT_LIMIT = 300;

function failure(
  code:
    | 'unauthorized'
    | 'read_only'
    | 'limit_reached'
    | 'refused'
    | 'invalid_output'
    | 'upstream'
    | 'bad_request',
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
): Response {
  return jsonResponse({ ok: false, error, code, ...extra }, status);
}

/** Pierwszy dzień następnego miesiąca w UTC — od tej chwili licznik startuje od zera. */
function nextMonthStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function monthlyLimit(): number {
  const raw = Number(Deno.env.get('AI_MONTHLY_LIMIT') ?? DEFAULT_LIMIT);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULT_LIMIT;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return failure('bad_request', 'Metoda niedozwolona.', 405);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return failure('unauthorized', 'Brak autoryzacji.', 401);

  let body: { action?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return failure('bad_request', 'Nieczytelne żądanie.', 400);
  }

  try {
    const supabase = userClient(authHeader);
    const workspace = await ownedWorkspace(supabase);
    if (!workspace) return failure('unauthorized', 'Zaloguj się ponownie.', 401);

    const { data: canWrite } = await supabase.rpc('workspace_can_write', { ws: workspace.id });
    if (!canWrite) {
      return failure(
        'read_only',
        'Asystent AI jest dostępny w aktywnej subskrypcji albo w trakcie okresu próbnego.',
        403,
      );
    }

    const limit = monthlyLimit();
    const { data: usedRaw, error: usageError } = await supabase.rpc('ai_usage_this_month', {
      ws: workspace.id,
    });
    if (usageError) throw usageError;
    const used = typeof usedRaw === 'number' ? usedRaw : Number(usedRaw ?? 0);
    const quota = { used, limit, resetsAt: nextMonthStart() };

    // Akcja `usage` nie woła modelu i nie liczy się do puli.
    if (body.action === 'usage') return jsonResponse({ ok: true, data: quota });

    if (!isActionName(body.action)) return failure('bad_request', 'Nieznana akcja.', 400);
    const action = ACTIONS[body.action];

    if (used >= limit) {
      return failure(
        'limit_reached',
        `Wyczerpany limit ${limit} wywołań asystenta w tym miesiącu.`,
        429,
        quota,
      );
    }

    const payload = action.payloadSchema.safeParse(body.payload);
    if (!payload.success) {
      console.error('ai: zły ładunek', body.action, payload.error.issues.slice(0, 3));
      return failure('bad_request', 'Dane do asystenta mają zły kształt.', 400);
    }

    const result = await runStructured({
      model: action.model,
      system: action.system,
      // `safeParse` zwraca typ konkretnej akcji; `messages` każdej akcji przyjmuje
      // swój własny ładunek, więc rzutowanie przez `never` jest tu bezpieczne —
      // dopasowanie zapewnia wspólny klucz w `ACTIONS`.
      messages: action.messages(payload.data as never),
      schema: action.outputSchema,
      effort: action.effort,
    });

    if (result.kind === 'refused') {
      console.warn('ai: odmowa', body.action, result.explanation);
      return failure('refused', 'Asystent odmówił wykonania tego zadania.', 422);
    }
    if (result.kind === 'invalid') {
      console.error('ai: zły kształt odpowiedzi', body.action, result.detail);
      return failure('invalid_output', result.detail, 502);
    }

    const admin = adminClient();
    const { error: insertError } = await admin.from('ai_usage').insert({
      workspace_id: workspace.id,
      action: body.action,
      model: result.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
    });
    // Zużycie nie zapisało się → odpowiedź i tak idzie do użytkownika (ma
    // wynik, za który zapłaciliśmy); logujemy, żeby rozjazd był widoczny.
    if (insertError) console.error('ai: zapis zużycia', insertError);

    return jsonResponse({ ok: true, data: result.data, usage: result.usage });
  } catch (error) {
    console.error('ai', error);
    const message = error instanceof Error ? error.message : 'Nieznany błąd.';
    return failure('upstream', message, 500);
  }
});
