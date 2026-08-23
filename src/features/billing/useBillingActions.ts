import { useCallback, useState } from 'react';
import type { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSupabase } from '@/data/supabase';
import { queryKeys } from '@/data/query-keys';
import { openExternal, runningInTauri } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';
import { pl } from '@/i18n/pl';

const log = createLogger('billing');

/** Okres rozliczeniowy — nie plan i nie pakiet (patrz `_shared/stripe.ts`). */
export type BillingPeriod = 'monthly' | 'yearly';

export interface BillingActions {
  /** Otwiera Stripe Checkout w przeglądarce systemowej. */
  startCheckout: (period: BillingPeriod) => Promise<void>;
  /** Otwiera Customer Portal (zmiana okresu, anulowanie, faktury). */
  openPortal: () => Promise<void>;
  busy: boolean;
}

/**
 * Płatność otwieramy **w przeglądarce systemowej**, nie w webview aplikacji:
 * Stripe blokuje osadzanie Checkoutu w ramkach, a użytkownik i tak chce mieć
 * przy płaceniu swojego menedżera haseł i autouzupełnianie karty.
 */
export function useBillingActions(): BillingActions {
  const [busy, setBusy] = useState(false);

  const invokeAndOpen = useCallback(
    async (fn: 'stripe-create-checkout' | 'stripe-create-portal', body?: unknown) => {
      setBusy(true);
      try {
        const response = await getSupabase().functions.invoke<{ url?: string }>(fn, {
          body: body ?? {},
        });

        if (response.error) throw response.error;
        const url = response.data?.url;
        if (!url) throw new Error(pl.billing.noUrl);

        if (runningInTauri()) {
          await openExternal(url);
        } else {
          // W przeglądarce (`pnpm dev`) nie ma czego otwierać „na zewnątrz".
          window.open(url, '_blank', 'noopener');
        }
      } catch (error) {
        log.error(fn, error);
        toast.error(error instanceof Error ? error.message : pl.billing.failed);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const startCheckout = useCallback(
    (period: BillingPeriod) => invokeAndOpen('stripe-create-checkout', { plan: period }),
    [invokeAndOpen],
  );

  const openPortal = useCallback(() => invokeAndOpen('stripe-create-portal'), [invokeAndOpen]);

  return { startCheckout, openPortal, busy };
}

/** Ile razy i jak często pytamy o subskrypcję po powrocie z Checkoutu. */
const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

/**
 * Odświeżanie subskrypcji po powrocie deep linkiem.
 *
 * Webhook Stripe potrafi dojść **po** tym, jak użytkownik wróci do aplikacji,
 * więc jedno unieważnienie cache nic by nie dało — przez pół minuty pytamy
 * ponownie, aż status przestanie być próbny. Bez tego człowiek płaci i dalej
 * widzi „opłać dostęp", co wygląda na zgubioną płatność.
 */
export function pollSubscriptionAfterCheckout(
  queryClient: ReturnType<typeof useQueryClient>,
): () => void {
  let attempts = 0;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    attempts += 1;

    await queryClient.invalidateQueries({ queryKey: queryKeys.subscription });

    const subscription = queryClient.getQueryData<{ status?: string } | null>(
      queryKeys.subscription,
    );

    // `trialing` znaczy, że webhook jeszcze nie dotarł — pytamy dalej.
    if (subscription?.status && subscription.status !== 'trialing') return;
    if (attempts >= POLL_ATTEMPTS) {
      log.warn('Subskrypcja nie zmieniła statusu po powrocie z Checkoutu');
      return;
    }

    setTimeout(() => void tick(), POLL_INTERVAL_MS);
  };

  void tick();
  return () => {
    stopped = true;
  };
}
