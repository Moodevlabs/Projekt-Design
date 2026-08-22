import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/data/queries/useSubscription';
import type { Subscription, SubscriptionStatus } from '@/data/repos/subscription.repo';
import { routes } from '@/app/routes';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const TRIAL_DAYS = 14;
/** Poniżej tylu dni trial robi się „ostrzegawczy". */
const WARNING_DAYS = 3;

/**
 * Subskrypcja — cicha karta w prawej szynie. Zamiast generycznego paska
 * postępu: 14 tyknięć-dni (echo kropek TAK/NIE z bilansu) — pozostałe dni
 * pełne, zużyte wygaszone.
 */
export function SubscriptionCard() {
  const subscription = useSubscription();

  return (
    <section className="card-surface p-6" aria-busy={subscription.isLoading || undefined}>
      <h2 className="text-ink-soft text-[11px] font-semibold tracking-[0.14em] uppercase">
        {pl.billing.title}
      </h2>

      {subscription.isLoading ? (
        <>
          <Skeleton className="mt-4 h-5 w-32" />
          <Skeleton className="mt-3 h-2 w-full" />
          <Skeleton className="mt-5 h-9 w-full" />
        </>
      ) : (
        <SubscriptionBody data={subscription.data ?? null} />
      )}
    </section>
  );
}

function SubscriptionBody({ data }: { data: Subscription | null }) {
  const isTrial = data?.status === 'trialing';
  const trialEndsAt = isTrial && data.trialEndsAt ? new Date(data.trialEndsAt) : null;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <>
      <p className={cn('mt-3 text-sm font-semibold', statusTone(data?.status))}>
        {statusLabel(data?.status)}
      </p>

      {isTrial && daysLeft !== null ? (
        <>
          <p className="text-ink-soft mt-1 text-xs">{pl.dashboard.trialDaysLeft(daysLeft)}</p>
          <TrialTicks daysLeft={daysLeft} />
        </>
      ) : data?.status === 'active' && data.currentPeriodEnd ? (
        <p className="text-ink-soft mt-1 text-xs">
          {pl.dashboard.renewalOn(formatDate(data.currentPeriodEnd))}
        </p>
      ) : null}

      <Button variant={isTrial ? 'default' : 'outline'} className="mt-5 w-full" asChild>
        <Link to={routes.subscription}>{isTrial ? pl.billing.buy : pl.billing.manage}</Link>
      </Button>
    </>
  );
}

/** 14 tyknięć-dni; informację niesie tekst wyżej, więc `aria-hidden`. */
function TrialTicks({ daysLeft }: { daysLeft: number }) {
  const low = daysLeft <= WARNING_DAYS;

  return (
    <div aria-hidden className="mt-3 flex gap-1">
      {Array.from({ length: TRIAL_DAYS }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            index < daysLeft ? (low ? 'bg-ink/45' : 'bg-cta') : 'bg-[var(--hair)]',
          )}
        />
      ))}
    </div>
  );
}

function statusLabel(status: SubscriptionStatus | undefined): string {
  switch (status) {
    case 'trialing':
      return pl.billing.trial;
    case 'active':
      return pl.billing.active;
    case 'past_due':
      return pl.billing.pastDue;
    case 'canceled':
      return pl.billing.canceled;
    default:
      return pl.dashboard.noSubscription;
  }
}

function statusTone(status: SubscriptionStatus | undefined): string {
  switch (status) {
    case 'past_due':
      return 'text-ink-soft';
    case 'canceled':
      return 'text-danger';
    default:
      return 'text-ink';
  }
}
