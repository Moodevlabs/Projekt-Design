import { FunctionsHttpError } from '@supabase/supabase-js';

import {
  AI_ERROR_CODES,
  AI_RESULT_SCHEMAS,
  AiQuotaSchema,
  AiUsageSchema,
  type AiAction,
  type AiErrorCode,
  type AiPayloadOf,
  type AiQuota,
  type AiResultOf,
  type AiUsage,
} from '@/domain/ai';
import { getSupabase } from '../supabase';
import { RepoError } from './errors';

/**
 * Jedyne wejście do funkcji brzegowej `ai` (FEATURES-AI.md §1.3).
 *
 * Komponenty nie wołają `functions.invoke` same: tu mapujemy ciało błędu na
 * `AiError` z kodem (żeby UI pokazał „limit wyczerpany, odnowi się 1 listopada"
 * zamiast „non-2xx status code") i walidujemy odpowiedź schematem domeny
 * (żeby komponent dostał kształt z wypełnionymi domyślnymi, a nie surowy JSON).
 */

export class AiError extends RepoError {
  constructor(
    message: string,
    public readonly code: AiErrorCode,
    public readonly quota: AiQuota | null = null,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

interface FailureBody {
  ok?: false;
  error?: string;
  code?: string;
  used?: number;
  limit?: number;
  resetsAt?: string;
}

function isErrorCode(code: unknown): code is AiErrorCode {
  return typeof code === 'string' && (AI_ERROR_CODES as readonly string[]).includes(code);
}

async function toAiError(failure: unknown): Promise<AiError> {
  if (failure instanceof FunctionsHttpError) {
    let body: FailureBody | null = null;
    // `context` jest w typach SDK `any`; traktujemy go jak nieznaną odpowiedź
    // (ten sam zabieg co `readFunctionError` w `useNotifications`).
    const context: unknown = failure.context;
    if (context instanceof Response) {
      try {
        body = (await context.clone().json()) as FailureBody;
      } catch {
        body = null;
      }
    }
    const code = isErrorCode(body?.code) ? body.code : 'upstream';
    const quota =
      code === 'limit_reached'
        ? AiQuotaSchema.safeParse({
            used: body?.used,
            limit: body?.limit,
            resetsAt: body?.resetsAt,
          })
        : null;
    return new AiError(body?.error ?? failure.message, code, quota?.success ? quota.data : null);
  }
  // Przerwanie przez `AbortSignal.timeout` wraca z functions-js jako błąd
  // relay z oryginalnym wyjątkiem w `context` (`TimeoutError` / `AbortError`).
  const inner: unknown = (failure as { context?: unknown }).context;
  const name = [failure, inner].find((e): e is Error => e instanceof Error)?.name;
  if (name === 'TimeoutError' || name === 'AbortError') {
    return new AiError('Asystent nie zdążył odpowiedzieć.', 'timeout');
  }
  const message = failure instanceof Error ? failure.message : 'Asystent AI nie odpowiedział.';
  return new AiError(message, 'network');
}

/**
 * Ile czekamy na odpowiedź modelu.
 *
 * Brama funkcji brzegowych Supabase i tak ucina żądanie po ~150 s; bez
 * własnego limitu `fetch` w webview potrafił wisieć bez końca i arkusz
 * pokazywał „Czytam brief…" długo po tym, jak serwer skończył (2026-10-22).
 * Z limitem użytkownik dostaje czytelny błąd i przycisk „Spróbuj ponownie".
 */
export const AI_TIMEOUT_MS = 150_000;

export interface AiInvocation<A extends AiAction> {
  data: AiResultOf<A>;
  usage: AiUsage;
}

export async function invokeAi<A extends AiAction>(
  action: A,
  payload: AiPayloadOf<A>,
): Promise<AiInvocation<A>> {
  const response = await getSupabase().functions.invoke<{
    ok?: boolean;
    data?: unknown;
    usage?: unknown;
  }>('ai', { body: { action, payload }, signal: AbortSignal.timeout(AI_TIMEOUT_MS) });

  if (response.error) throw await toAiError(response.error);

  const parsed = AI_RESULT_SCHEMAS[action].safeParse(response.data?.data);
  if (!parsed.success) {
    throw new AiError('Odpowiedź asystenta ma nieoczekiwany kształt.', 'invalid_output');
  }

  const usage = AiUsageSchema.safeParse(response.data?.usage);
  return {
    data: parsed.data,
    usage: usage.success ? usage.data : { inputTokens: 0, outputTokens: 0 },
  };
}

/** Stan limitu — bez wywołania modelu, nie zużywa puli. */
export async function fetchAiQuota(): Promise<AiQuota> {
  const response = await getSupabase().functions.invoke<{ ok?: boolean; data?: unknown }>('ai', {
    body: { action: 'usage' },
  });
  if (response.error) throw await toAiError(response.error);

  const parsed = AiQuotaSchema.safeParse(response.data?.data);
  if (!parsed.success) throw new AiError('Nie udało się odczytać limitu.', 'invalid_output');
  return parsed.data;
}
