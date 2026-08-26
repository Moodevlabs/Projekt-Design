import { Check, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/data/queries/useSubscription';
import { formatDate } from '@/lib/dates';
import { useBillingActions, type BillingPeriod } from './useBillingActions';
import { useEntitlement } from './useEntitlement';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Ekran płatności.
 *
 * Świadomie **nie wygląda jak cennik z pakietami** — nie ma czego porównywać.
 * Aplikacja jest płatna w całości, więc jedyna decyzja to częstotliwość
 * płatności, i tylko ona jest tu wyborem.
 */
export function SubscriptionPage() {
  const subscription = useSubscription();
  const entitlement = useEntitlement();
  const { startCheckout, openPortal, busy } = useBillingActions();

  // `isPending`, nie `isLoading`: zapytanie czekające na workspace nie jest
  // „ładujące się", a i tak nie ma jeszcze czego pokazać.
  if (subscription.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-[var(--radius-card)]" />
        <Skeleton className="h-48 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const notice = noticeFor(entitlement.reason);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card-surface space-y-3 p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-ink text-sm font-semibold">{pl.billing.statusLabel}</h2>
          <StatusPill reason={entitlement.reason} />
        </header>

        {entitlement.reason === 'trial' && entitlement.daysLeft !== undefined ? (
          <div className="space-y-1">
            <p className="text-ink text-sm">{pl.billing.trialDaysLeft(entitlement.daysLeft)}</p>
            <p className="text-ink-soft text-xs">{pl.billing.trialExplainer}</p>
          </div>
        ) : null}

        {notice ? <p className="text-ink-soft text-sm">{notice}</p> : null}

        {entitlement.renewsAt ? (
          <p className="text-ink-soft text-xs">
            {entitlement.cancelAtPeriodEnd
              ? pl.billing.endsAt(formatDate(new Date(entitlement.renewsAt)))
              : pl.billing.renewsAt(formatDate(new Date(entitlement.renewsAt)))}
          </p>
        ) : null}

        {entitlement.hasCustomer ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void openPortal()}>
            <ExternalLink className="size-4" aria-hidden />
            {pl.billing.manage}
          </Button>
        ) : null}
      </section>

      <section className="card-surface space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="text-ink text-sm font-semibold">{pl.billing.buy}</h2>
          <p className="text-ink-soft text-sm">{pl.billing.intro}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PeriodCard
            period="monthly"
            title={pl.billing.monthly}
            price={pl.billing.prices.monthly}
            busy={busy}
            onSelect={startCheckout}
          />
          <PeriodCard
            period="yearly"
            title={pl.billing.yearly}
            price={pl.billing.prices.yearly}
            before={pl.billing.prices.yearlyBefore}
            hint={pl.billing.prices.yearlySaving}
            busy={busy}
            onSelect={startCheckout}
          />
        </div>

        <p className="text-ink-soft text-xs">{pl.billing.dataSafe}</p>
      </section>

      {!entitlement.canWrite ? (
        <Alert>
          <AlertDescription>{pl.billing.readOnlyBanner}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function PeriodCard({
  period,
  title,
  price,
  before,
  hint,
  busy,
  onSelect,
}: {
  period: BillingPeriod;
  title: string;
  price: string;
  /** Kwota, ktorej klient NIE placi — 12 x cena miesieczna (T-66). */
  before?: string;
  hint?: string;
  busy: boolean;
  onSelect: (period: BillingPeriod) => Promise<void>;
}) {
  return (
    <div className="border-hair flex flex-col gap-2 rounded-[var(--radius-card)] border p-4">
      <p className="text-ink text-sm font-medium">{title}</p>
      <p className="text-ink flex items-baseline gap-2 text-lg font-semibold">
        {price}
        {before ? (
          <span className="text-ink-soft text-xs font-normal line-through">{before}</span>
        ) : null}
      </p>
      {hint ? (
        <p className="text-ink-soft flex items-center gap-1 text-xs">
          <Check className="size-3.5" aria-hidden />
          {hint}
        </p>
      ) : null}
      <Button
        type="button"
        className="mt-1"
        disabled={busy}
        onClick={() => void onSelect(period)}
      >
        <CreditCard className="size-4" aria-hidden />
        {pl.billing.buy}
      </Button>
    </div>
  );
}

function StatusPill({ reason }: { reason: ReturnType<typeof useEntitlement>['reason'] }) {
  const label =
    reason === 'trial'
      ? pl.billing.trial
      : reason === 'active'
        ? pl.billing.active
        : reason === 'grace'
          ? pl.billing.pastDue
          : reason === 'canceled'
            ? pl.billing.canceled
            : pl.billing.noSubscription;

  const ok = reason === 'trial' || reason === 'active';

  return (
    <span
      className={cn(
        'rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-positive-wash text-positive' : 'bg-surface text-ink-soft',
      )}
    >
      {label}
    </span>
  );
}

function noticeFor(reason: ReturnType<typeof useEntitlement>['reason']): string | null {
  switch (reason) {
    case 'grace':
      return pl.billing.pastDueNotice;
    case 'canceled':
      return pl.billing.canceledNotice;
    case 'expired':
      return pl.billing.expiredNotice;
    case 'none':
      return pl.billing.noSubscription;
    default:
      return null;
  }
}
