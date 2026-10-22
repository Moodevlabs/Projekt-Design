import Anthropic from 'npm:@anthropic-ai/sdk@0.137.0';
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@0.137.0/helpers/beta/zod';
import type { z } from 'npm:zod@3.25.67/v4';

/**
 * Klient Anthropic dla funkcji brzegowych (FEATURES-AI.md §1.1).
 *
 * Jedno miejsce, w którym padają: lista modeli, nagłówki beta, sposób
 * wymuszenia JSON-a i obsługa odmowy. Akcje (`ai/actions/*`) wybierają model
 * i dostarczają prompt, wiadomości i schemat — nie dotykają SDK.
 *
 * ## Model dopasowany do zadania (decyzja właściciela 2026-10-22)
 *
 * Nie każda akcja wymaga tego samego: ocena briefu i dobór zakresu to
 * rozumowanie nad biblioteką (Opus); odczyt cennika i mapowanie uwag na
 * pozycje to ekstrakcja i dopasowanie (Sonnet); przepisanie trzech zdań to
 * zadanie, przy którym droższy model nie daje nic ponad koszt (Haiku).
 * Każde wywołanie zapisuje model w `ai_usage.model`, więc zmiana przypisania
 * nie psuje statystyk.
 *
 * ## Dlaczego `beta.messages.parse`
 *
 * `output_config.format` zmusza model do JSON-a zgodnego ze schematem, a
 * `parse` od razu oddaje `parsed_output`. Namespace beta, bo tam żyje
 * `fallbacks: 'default'` — gdy klasyfikator odmówi, zapytanie idzie na
 * zapasowy model po stronie API, zamiast wracać do nas jako odmowa. Haiku
 * nie ma zapasowego modelu po stronie API, więc dla niego parametr nie jest
 * wysyłany — odmowa wraca jako `refused`.
 */

export const AI_MODELS = {
  /** Rozumowanie: dobór zakresu z biblioteki na podstawie briefu. */
  reasoning: 'claude-opus-5-5',
  /** Ekstrakcja i mapowanie: cennik z pliku, uwagi → pozycje. */
  extraction: 'claude-sonnet-5-5',
  /** Redakcja krótkiego tekstu. */
  writing: 'claude-haiku-5-5',
} as const;

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS];

/** Modele, które przyjmują `fallbacks: 'default'` (Haiku go nie ma). */
const FALLBACK_CAPABLE: ReadonlySet<string> = new Set([AI_MODELS.reasoning, AI_MODELS.extraction]);

const MAX_TOKENS = 16000;

export type Effort = 'low' | 'medium' | 'high';

export function anthropicClient(): Anthropic {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Brak ANTHROPIC_API_KEY w sekretach funkcji.');
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export type StructuredResult<T> =
  | {
      kind: 'ok';
      data: T;
      /** Model, który odpowiedział — po zapasowym może być spoza `AI_MODELS`. */
      model: string;
      usage: { inputTokens: number; outputTokens: number };
    }
  | { kind: 'refused'; explanation: string | null }
  | { kind: 'invalid'; detail: string };

export interface StructuredRequest<S extends z.ZodType> {
  model: AiModel;
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: S;
  effort: Effort;
}

export async function runStructured<S extends z.ZodType>(
  request: StructuredRequest<S>,
): Promise<StructuredResult<z.infer<S>>> {
  const client = anthropicClient();
  const withFallback = FALLBACK_CAPABLE.has(request.model);

  const response = await client.beta.messages.parse({
    model: request.model,
    max_tokens: MAX_TOKENS,
    ...(withFallback
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {}),
    // Prompt systemowy jest stały per akcja — to on się cache'uje. Dane
    // użytkownika zawsze idą w `messages`, za punktem cache.
    system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
    messages: request.messages,
    output_config: { format: betaZodOutputFormat(request.schema), effort: request.effort },
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
    // Po zapasowym modelu `response.model` może różnić się od żądanego —
    // do statystyk zapisujemy ten, który odpowiedział.
    model: response.model || request.model,
    usage: {
      inputTokens:
        usage.input_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
    },
  };
}
