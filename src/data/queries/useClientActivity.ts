import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { queryKeys } from '@/data/query-keys';
import { getSupabase } from '@/data/supabase';
import { isConfigured } from '@/lib/env';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('realtime');

/**
 * Powiadomienia o ruchu klienta pod linkiem (T-26).
 *
 * Subskrypcja Realtime na `quote_comments` i `quote_acceptances`. RLS działa
 * tak samo jak przy zwykłym SELECT, więc przychodzą wyłącznie zdarzenia
 * z wycen tego workspace'u — nie filtrujemy niczego po stronie klienta.
 *
 * Dlaczego Realtime, a nie odpytywanie co minutę: to jest zdarzenie, na które
 * projektant CZEKA i po którym coś robi (dzwoni, wystawia fakturę, zaczyna
 * projekt). Dowiedzenie się o akceptacji ze średnim opóźnieniem pół minuty
 * jest gorsze od komunikatu, który wchodzi w chwili kliknięcia.
 *
 * Wołane raz, w powłoce aplikacji. Lista uwag w oknie „Udostępnij" ma własne
 * odświeżanie — to jest kanał do człowieka patrzącego na inny ekran.
 */
export function useClientActivity(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConfigured) return;

    const channel = getSupabase()
      .channel('ruch-klienta')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quote_acceptances' },
        (payload) => {
          const quoteId = readQuoteId(payload.new);
          toast.success(pl.share.acceptedToast, { duration: 10_000 });
          invalidate(queryClient, quoteId);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quote_comments' },
        (payload) => {
          const quoteId = readQuoteId(payload.new);
          toast.info(pl.share.commentToast, { duration: 10_000 });
          invalidate(queryClient, quoteId);
        },
      )
      .subscribe((status) => {
        // Zerwane połączenie nie może niczego zepsuć: dane i tak dojdą przy
        // następnym odświeżeniu listy. Zapisujemy to tylko w logu.
        if (
          status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
          status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT
        ) {
          log.warn('Kanał ruchu klienta nieaktywny', status);
        }
      });

    return () => {
      void getSupabase().removeChannel(channel);
    };
  }, [queryClient]);
}

function readQuoteId(row: unknown): string | null {
  if (typeof row !== 'object' || row === null) return null;
  const value = (row as Record<string, unknown>).quote_id;
  return typeof value === 'string' ? value : null;
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, quoteId: string | null): void {
  // Status wyceny zmienia się razem z akceptacją, więc lista też jest nieświeża.
  void queryClient.invalidateQueries({ queryKey: queryKeys.quotes() });
  if (!quoteId) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.quote(quoteId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.quoteComments(quoteId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.quoteAcceptance(quoteId) });
}
