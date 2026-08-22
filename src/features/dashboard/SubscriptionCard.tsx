import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSection } from '@/components/shared';
import { useSubscription } from '@/data/queries/useSubscription';
import { routes } from '@/app/routes';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const TRIAL_DAYS = 14;

export function SubscriptionCard() {
  const subscription = useSubscription();

  if (subscription.isLoading) {
    return (
      <PageSection title={pl.billing.title}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-2 w-full" />
        <Skeleton className="mt-4 h-9 w-full" />
      </PageSection>
    );
  }

  const data = subscription.data;
  const trialEndsAt = data?.trialEndsAt ? new Date(data.trialEndsAt) : null;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const isTrial = data?.status === 'trialing';
  // Pasek pokazuje, ile triala zostało — pełny na starcie, pusty w dniu końca.
  const progress = daysLeft === null ? 0 : Math.min(100, (daysLeft / TRIAL_DAYS) * 100);

  return (
    <PageSection title={pl.billing.title}>
      <p className="text-ink text-sm font-medium">
        {isTrial ? pl.billing.trial : statusLabel(data?.status)}
      </p>

      {isTrial && daysLeft !== null ? (
        <>
          <p className="text-ink-soft mt-1 text-xs">{pl.billing.trialEndsIn(daysLeft)}</p>
          <Progress value={progress} className="mt-3" />
        </>
      ) : data?.currentPeriodEnd ? (
        <p className="text-ink-soft mt-1 text-xs">
          Odnowienie: {formatDate(data.currentPeriodEnd)}
        </p>
      ) : null}

      <Button variant={isTrial ? 'default' : 'outline'} className="mt-4 w-full" asChild>
        <Link to={routes.subscription}>{isTrial ? pl.billing.buy : pl.billing.manage}</Link>
      </Button>
    </PageSection>
  );
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'active':
      return pl.billing.active;
    case 'past_due':
      return pl.billing.pastDue;
    case 'canceled':
      return pl.billing.canceled;
    default:
      return pl.billing.title;
  }
}
