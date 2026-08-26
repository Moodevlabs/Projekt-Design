import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/data/query-keys';
import {
  createShare,
  latestAcceptance,
  listQuoteComments,
  listShares,
  markCommentRead,
  revokeShare,
} from '@/data/repos/shares.repo';

/** Linki do wyceny — najnowszy pierwszy. */
export function useShares(quoteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shares(quoteId ?? ''),
    queryFn: () => listShares(quoteId!),
    enabled: Boolean(quoteId),
  });
}

export function useCreateShare(quoteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expiryDays: number | null) => createShare(quoteId, expiryDays),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shares(quoteId) });
    },
  });
}

export function useRevokeShare(quoteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shareId: string) => revokeShare(shareId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shares(quoteId) });
    },
  });
}

/**
 * Uwagi klienta. `refetchInterval` jest tu świadomie, zamiast Realtime:
 * to jeden lekki select na otwartej karcie wyceny, a nie subskrypcja, którą
 * trzeba by sprzątać przy każdym odmontowaniu. Realtime wchodzi wtedy, gdy
 * powiadomienie ma dojść do człowieka patrzącego na inny ekran.
 */
export function useQuoteComments(quoteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quoteComments(quoteId ?? ''),
    queryFn: () => listQuoteComments(quoteId!),
    enabled: Boolean(quoteId),
    refetchInterval: 60_000,
  });
}

export function useMarkCommentRead(quoteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => markCommentRead(commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.quoteComments(quoteId) });
    },
  });
}

/** Akceptacja wyceny — `null`, dopóki klient jej nie kliknął. */
export function useQuoteAcceptance(quoteId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.quoteAcceptance(quoteId ?? ''),
    queryFn: () => latestAcceptance(quoteId!),
    enabled: Boolean(quoteId),
  });
}
