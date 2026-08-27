import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TrialTicks } from './TrialTicks';
import { useSubscription } from '@/data/queries/useSubscription';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Klucz zapamiętania: pokazujemy okno raz dziennie, nie przy każdym renderze. */
const STORAGE_KEY = 'toolier:trial-dialog-shown';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function alreadyShownToday(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === today();
  } catch {
    // Prywatne okno albo zablokowane dane witryny — wtedy pokażemy raz na
    // uruchomienie. To wciąż lepsze niż nie pokazać wcale.
    return false;
  }
}

/**
 * Okno okresu próbnego przy starcie (poprawka 6, 2026-08-27).
 *
 * ## Co zastąpiło
 *
 * Kartę „Subskrypcja" w prawej szynie pulpitu. Karta stała tam **zawsze** —
 * także po opłaceniu, gdzie nie miała nic do powiedzenia poza datą odnowienia,
 * i zabierała miejsce w widoku, który ma mówić o klientach, a nie o rachunkach.
 *
 * ## Kiedy się pokazuje
 *
 * Wyłącznie w okresie próbnym i **raz dziennie**. Okno przy każdym wejściu
 * na pulpit uczy odklikiwania bez czytania — a wtedy przestaje działać
 * dokładnie w dniu, w którym miałoby znaczenie. Po opłaceniu subskrypcję
 * obsługuje się z ustawień i tylko stamtąd.
 */
export function TrialDialog() {
  const subscription = useSubscription();
  const [open, setOpen] = useState(false);

  const status = subscription.data?.status;
  const trialEndsAt = subscription.data?.trialEndsAt ?? null;

  useEffect(() => {
    if (status !== 'trialing') return;
    if (alreadyShownToday()) return;

    setOpen(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, today());
    } catch {
      // Zapamiętanie jest wygodą, nie funkcją — cisza jest OK.
    }
  }, [status]);

  if (status !== 'trialing') return null;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.billing.trial}</DialogTitle>
          <DialogDescription>{pl.dashboard.trialDaysLeft(daysLeft)}</DialogDescription>
        </DialogHeader>

        <TrialTicks daysLeft={daysLeft} />

        <p className="text-ink-soft text-sm">{pl.billing.trialDialogHint}</p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {pl.billing.trialDialogLater}
          </Button>
          <Button asChild onClick={() => setOpen(false)}>
            <Link to={routes.subscription}>{pl.billing.buy}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
