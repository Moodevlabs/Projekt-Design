import type Anthropic from 'npm:@anthropic-ai/sdk@1.1.0';
import type { z } from 'npm:zod@3.25.67';
import type { AiModel, Effort } from '../../_shared/anthropic.ts';

/**
 * Definicja akcji asystenta: co przyjmuje, co odpowiada, jak pyta, którym modelem.
 *
 * `system` jest **stałym tekstem** (cache prefix), `messages` buduje
 * wiadomość użytkownika z ładunku. Akcja nie wie nic o HTTP ani o SDK —
 * tym zajmuje się `index.ts` i `_shared/anthropic.ts`. `model` wybiera się
 * z `AI_MODELS` po rodzaju pracy, nie po nazwie modelu.
 */
export interface ActionDef<P extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  payloadSchema: P;
  outputSchema: O;
  model: AiModel;
  effort: Effort;
  system: string;
  messages(payload: z.infer<P>): Anthropic.Beta.BetaMessageParam[];
}

export function defineAction<P extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  def: ActionDef<P, O>,
): ActionDef<P, O> {
  return def;
}

/** Wspólny nagłówek roli — ten sam w każdej akcji, żeby prefix cache'u był identyczny. */
export const ROLE_PREAMBLE = `Jesteś asystentem w programie Toolier — aplikacji dla studiów projektowania wnętrz, w której projektant prowadzi klientów, projekty i wyceny. Pracujesz WYŁĄCZNIE dla projektanta; nigdy nie zwracasz się do inwestora (klienta końcowego).

Zasady nadrzędne:
1. Nie wymyślasz ani nie szacujesz cen. Każda kwota pochodzi z danych, które dostajesz (biblioteka usług projektanta albo dokument, który sam wgrał). Brak ceny to brak ceny (null), nie zero.
2. Zwracasz wyłącznie dane zgodne ze schematem — bez komentarzy poza polami do tego przeznaczonymi.
3. Piszesz po polsku, poprawną polszczyzną, w tonie profesjonalnego studia projektowego: konkretnie, bez przesady i bez pustych frazesów.
4. Identyfikatory (id) kopiujesz dosłownie z danych wejściowych. Nigdy nie tworzysz własnych identyfikatorów.`;

export function textBlock(text: string): Anthropic.Beta.BetaTextBlockParam {
  return { type: 'text', text };
}
