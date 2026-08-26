import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/data/queries/useSubscription';
import { formatDate } from '@/lib/dates';
import { TrialTicks } from './TrialTicks';
import { useBillingActions, type BillingPeriod } from './useBillingActions';
import { useEntitlement } from './useEntitlement';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type Reason = ReturnType<typeof useEntitlement>['reason'];

/**
 * Ekran płatności.
 *
 * Świadomie **nie wygląda jak cennik z pakietami** — nie ma czego porównywać.
 * Aplikacja jest płatna w całości, więc jedyna decyzja to częstotliwość
 * płatności, i tylko ona jest tu wyborem.
 *
 * Stan dostępu jest **zdaniem, nie odznaką**. Kolorowa pigułka obok nagłówka
 * „Status" mówiła dokładnie tyle, co samo słowo pod spodem, a wnosiła kształt
 * obcy reszcie aplikacji: `StatusMark` przy wycenach ma w komentarzu wprost
 * „świadomie NIE jest to kolorowa pigułka", a karta na pulpicie pokazuje stan
 * linią tekstu i tyknięciami dni. Ten ekran był jedynym miejscem, które
 * mówiło innym językiem.
 */
export function SubscriptionPage() {
  const subscription = useSubscription();
  const entitlement = useEntitlement();
  const { startCheckout, openPortal, busy } = useBillingActions();

  // `isPending`, nie `isLoading`: zapytanie czekające na workspace nie jest
  // „ładujące się", a i tak nie ma jeszcze czego pokazać.
  if (subscription.isPending) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        <Skeleton className="h-56 rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const notice = noticeFor(entitlement.reason);
  const trialDays = entitlement.reason === 'trial' ? entitlement.daysLeft : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card-surface p-6">
        <h2 className="label-caps text-ink-soft">{pl.billing.accessLabel}</h2>

        {/*
          Stan niesie SŁOWO, a jego kondycję — barwa tego słowa. Ten sam
          zabieg co w karcie na pulpicie, zamiast osobnej odznaki obok.
        */}
        <p className={cn('mt-3 text-[22px] leading-none', toneFor(entitlement.reason))}>
          {headingFor(entitlement.reason)}
        </p>

        {trialDays !== undefined ? (
          <>
            <p className="text-ink mt-3 text-sm">{pl.billing.trialDaysLeft(trialDays)}</p>
            <TrialTicks daysLeft={trialDays} className="mt-3" />
            <p className="text-ink-soft mt-3 text-xs">{pl.billing.trialExplainer}</p>
          </>
        ) : null}

        {notice ? <p className="text-ink-soft mt-3 text-sm">{notice}</p> : null}

        {/*
          Stopka karty: data po lewej, akcja po prawej. Kreska oddziela stan
          od tego, co można z nim zrobić. Renderuje się tylko wtedy, gdy jest
          co w niej pokazać — pusty pasek z samą kreską byłby ozdobą.
        */}
        {entitlement.renewsAt || entitlement.hasCustomer ? (
          <div className="border-hair mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {entitlement.renewsAt ? (
              <p className="text-ink-soft text-xs">
                {entitlement.cancelAtPeriodEnd
                  ? pl.billing.endsAt(formatDate(new Date(entitlement.renewsAt)))
                  : pl.billing.renewsAt(formatDate(new Date(entitlement.renewsAt)))}
              </p>
            ) : (
              <span />
            )}

            {entitlement.hasCustomer ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void openPortal()}
              >
                <ExternalLink className="size-4" aria-hidden />
                {pl.billing.manage}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="card-surface p-6">
        <h2 className="label-caps text-ink-soft">{pl.billing.periodLabel}</h2>
        <p className="text-ink-soft mt-3 text-sm">{pl.billing.intro}</p>

        {/*
          Dwie opcje w JEDNEJ ramce rozdzielonej włosem, a nie dwie osobne
          karty. To nie są konkurencyjne pakiety, tylko dwie kolumny jednego
          cennika — i tak też mają wyglądać. Włos zmienia orientację razem
          z układem, żeby przy zwężeniu nie został pionowy.
        */}
        <div className="border-hair mt-5 grid overflow-hidden rounded-[var(--radius-card)] border sm:grid-cols-2">
          <PeriodOption
            period="monthly"
            title={pl.billing.monthly}
            price={pl.billing.prices.monthly}
            busy={busy}
            onSelect={startCheckout}
          />
          <PeriodOption
            period="yearly"
            title={pl.billing.yearly}
            price={pl.billing.prices.yearly}
            before={pl.billing.prices.yearlyBefore}
            hint={pl.billing.prices.yearlySaving}
            recommended
            busy={busy}
            onSelect={startCheckout}
          />
        </div>

        <p className="text-ink-soft mt-4 text-xs">{pl.billing.dataSafe}</p>
      </section>
    </div>
  );
}

function PeriodOption({
  period,
  title,
  price,
  before,
  hint,
  recommended,
  busy,
  onSelect,
}: {
  period: BillingPeriod;
  title: string;
  price: string;
  /** Kwota, ktorej klient NIE placi — 12 x cena miesieczna (T-66). */
  before?: string;
  hint?: string;
  /**
   * Korzystniejszy wybór. Znaczony **wagą przycisku i tłem**, nie wstążką
   * „NAJPOPULARNIEJSZY" — nie mamy danych o popularności, a mamy policzalną
   * różnicę w cenie, którą widać wyżej w przekreślonej kwocie.
   */
  recommended?: boolean;
  busy: boolean;
  onSelect: (period: BillingPeriod) => Promise<void>;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-5',
        // Włos między kolumnami: poziomy w układzie pionowym, pionowy w poziomym.
        'border-hair not-first:border-t sm:not-first:border-t-0 sm:not-first:border-l',
        recommended && 'bg-surface-2',
      )}
    >
      <p className="label-caps text-ink-soft">{title}</p>

      <div>
        <p className="tabular text-ink text-[21px] leading-tight font-medium">{price}</p>
        {before ? (
          <p className="text-ink-faint tabular mt-1 text-xs line-through">{before}</p>
        ) : null}
      </div>

      {/*
        `mt-auto` wyrównuje przyciski do dolnej krawędzi niezależnie od tego,
        że tylko roczna ma pod ceną dwie dodatkowe linijki.
      */}
      <div className="mt-auto space-y-3">
        {hint ? <p className="text-ink text-xs">{hint}</p> : null}
        <Button
          type="button"
          variant={recommended ? 'default' : 'outline'}
          className="w-full"
          disabled={busy}
          onClick={() => void onSelect(period)}
        >
          {pl.billing.buy}
        </Button>
      </div>
    </div>
  );
}

/** Krótka nazwa stanu do nagłówka. Wyjaśnienie, co z tym zrobić, niesie `noticeFor`. */
function headingFor(reason: Reason): string {
  switch (reason) {
    case 'trial':
      return pl.billing.trial;
    case 'active':
      return pl.billing.active;
    case 'grace':
      return pl.billing.pastDue;
    case 'canceled':
      return pl.billing.canceled;
    case 'expired':
      return pl.billing.expired;
    default:
      return pl.billing.inactive;
  }
}

/** Barwa samego słowa — jedyny nośnik koloru w tej karcie. */
function toneFor(reason: Reason): string {
  switch (reason) {
    case 'expired':
      return 'text-danger';
    case 'grace':
    case 'canceled':
      return 'text-warning';
    default:
      return 'text-ink';
  }
}

function noticeFor(reason: Reason): string | null {
  switch (reason) {
    case 'grace':
      return pl.billing.pastDueNotice;
    case 'canceled':
      return pl.billing.canceledNotice;
    case 'expired':
      return pl.billing.expiredNotice;
    default:
      // Przy `none` nagłówek „Brak aktywnej subskrypcji" mówi już wszystko,
      // a `noSubscription` powtarzałoby to samo innymi słowami.
      return null;
  }
}
