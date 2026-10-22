import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AiAction, AiPayloadOf, AiQuota } from '@/domain/ai';
import { fetchAiQuota, invokeAi, type AiError, type AiInvocation } from '../repos/ai.repo';

/**
 * Hooki asystenta AI (FEATURES-AI.md §1.3).
 *
 * Każda akcja to mutacja: wynik jest **propozycją**, którą komponent trzyma
 * w swoim stanie do chwili zatwierdzenia — nie ma tu cache'owania odpowiedzi,
 * bo ta sama odpowiedź nigdy nie wraca dwa razy. Po udanym wywołaniu
 * unieważniamy licznik limitu, żeby Ustawienia pokazały zużycie bez odświeżania.
 */

export const aiKeys = {
  quota: ['ai', 'quota'] as const,
};

export function useAiQuota() {
  return useQuery<AiQuota, AiError>({
    queryKey: aiKeys.quota,
    queryFn: fetchAiQuota,
    staleTime: 60_000,
    retry: false,
  });
}

function useAiAction<A extends AiAction>(action: A) {
  const queryClient = useQueryClient();
  return useMutation<AiInvocation<A>, AiError, AiPayloadOf<A>>({
    mutationFn: (payload) => invokeAi(action, payload),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: aiKeys.quota });
    },
  });
}

export function useAiImportLibrary() {
  return useAiAction('import-library');
}

export function useAiBriefToQuote() {
  return useAiAction('brief-to-quote');
}

export function useAiCommentsToChanges() {
  return useAiAction('comments-to-changes');
}

export function useAiPolishText() {
  return useAiAction('polish-text');
}

/** Wiadomość od klienta → klient, teczka i szkic wyceny (T-140). */
export function useAiMessageToProject() {
  return useAiAction('message-to-project');
}
