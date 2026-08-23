import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppCredit } from '@/app/AppCredit';
import { registerDeepLinks } from '@/app/deep-links';
import { pollSubscriptionAfterCheckout } from '@/features/billing/useBillingActions';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Korzeń drzewa tras — miejsce na rzeczy globalne wymagające routera. */
export function RootLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let unregister: (() => void) | undefined;
    let cancelled = false;

    void registerDeepLinks({
      onRecovery: () => void navigate(routes.newPassword, { replace: true }),
      /*
       * Powrót z Checkoutu. Webhook Stripe potrafi dojść PO deep linku, więc
       * samo unieważnienie cache nic by nie dało — odpytujemy przez chwilę,
       * aż status przestanie być próbny. Inaczej człowiek płaci i dalej widzi
       * „aktywuj dostęp", co wygląda jak zgubiona płatność.
       */
      onBilling: (url) => {
        if (url.pathname.startsWith('/cancel')) {
          toast.info(pl.billing.checkoutCanceled);
          return;
        }

        if (url.pathname.startsWith('/success')) {
          toast.info(pl.billing.returned);
          pollSubscriptionAfterCheckout(queryClient);
        }

        void navigate(routes.subscription);
      },
    }).then((off) => {
      if (cancelled) off();
      else unregister = off;
    });

    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [navigate, queryClient]);

  // Podpis renderujemy PRZED treścią, żeby panele rysowały się nad nim.
  return (
    <>
      <AppCredit />
      <Outlet />
    </>
  );
}
