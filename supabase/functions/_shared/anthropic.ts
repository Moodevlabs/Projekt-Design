import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@1.1.0/helpers/beta/zod';
import type { z } from 'npm:zod@3.25.67';

/**
 * Klient Anthropic dla funkcji brzegowych (FEATURES-AI.md §1.1).
 *
 * Jedno miejsce, w którym padają: nazwa modelu, nagłówki beta, sposób
 * wymuszenia JSON-a i obsługa odmowy. Akcje (`ai/actions/*`) dostarczają
 * tylko prompt, wiadomości i schemat — nie dotykają SDK.
 *
 * ## Dlaczego `beta.messages.parse`
 *
 * `output_config.format` zmusza model do JSON-a zgodnego ze schematem, a
 * `parse` od razu oddaje `parsed_output`. Namespace beta, bo tam żyje
 * `fallbacks: 'default'` — gdy klasyfikator odmówi, zapytanie idzie na
 * zapasowy model po stronie API, zamiast wracać do nas jako odmowa.
 */

export const AI_MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;

export type Effort = 'low' | 'medium' | 'high';

export function anthropicClient(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Brak ANTHROPIC_API_KEY w sekretach funkcji.');
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export type StructuredResult<T> =
  | { kind: 'ok'; data: T; usage: { inputTokens: number; outputTokens: number } }
  | { kind: 'refused'; explanation: string | null }
  | { kind: 'invalid'; detail: string };

export interface StructuredRequest<S extends z.ZodTypeAny> {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: S;
  effort: Effort;
}

export async function runStructured<S extends z.ZodTypeAny>(
  request: StructuredRequest<S>,
): Promise<StructuredResult<z.infer<S>>> {
  const client = anthropicClient();

  const response = await client.beta.messages.parse({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // Prompt systemowy jest stały per akcja — to on się cache'uje. Dane
    // użytkownika zawsze idą w `messages`, za punktem cache.
    system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
    messages: request.messages,
    output_config: { format: zodOutputFormat(request.schema), effort: request.effort },
  });

  if (response.stop_reason === 'refusal') {
    return { kind: 'refused', explanation: response.stop_details?.explanation ?? null };
  }
  if (response.stop_reason === 'max_tokens') {
    return { kind: 'invalid', detail: 'Odpowiedź przekroczyła limit długości.' };
  }

  const parsed = response.parsed_output;
  if (!parsed) return { kind: 'invalid', detail: 'Model nie zwrócił poprawnego JSON-a.' };

  const usage = response.usage;
  return {
    kind: 'ok',
    data: parsed as z.infer<S>,
    usage: {
      inputTokens:
        usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
    },
  };
}
