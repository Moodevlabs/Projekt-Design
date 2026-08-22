import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/shared';
import { useCountUp } from './useCountUp';
import { type DashboardStats } from './stats';
import { type SettledCounts } from './settled';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Bilans miesiąca — prawa szyna pulpitu, celowo w anatomii podsumowania
 * wyceny z edytora: drobne pozycje u góry, kreska, duża suma pod kreską,
 * a na końcu odpowiedzi klientów (TAK/NIE). Liczby osiadają przez
 * `useCountUp` — to jedyny mocny efekt na tym ekranie.
 */

const MONTH_TITLE = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });

/** Powyżej tej liczby rozstrzygnięć kropki przestają być czytelne — zostaje tekst. */
const MAX_DOTS = 10;

export function MonthLedger({
  stats,
  settled,
  loading,
}: {
  stats: DashboardStats;
  settled: SettledCounts;
  loading: boolean;
}) {
  const monthTitle = MONTH_TITLE.format(new Date());

  if (loading) {
    return (
      <section className="card-surface p-6" aria-busy="true" aria-label={monthTitle}>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-7 h-9 w-40" />
        <Skeleton className="mt-6 h-4 w-3/4" />
      </section>
    );
  }

  return (
    <section className="card-surface p-6" aria-label={monthTitle}>
      <h2 className="text-ink-soft text-[11px] font-semibold tracking-[0.14em] uppercase">
        {monthTitle}
      </h2>

      <dl className="mt-4">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="text-ink-soft text-sm">{pl.dashboard.created}</dt>
          <dd>
            <CountInt value={stats.quotesThisMonth} />
          </dd>
        </div>
        <div className="border-hair flex items-baseline justify-between gap-4 border-t py-2">
          <dt className="text-ink-soft text-sm">{pl.dashboard.averageValue}</dt>
          <dd>
            <CountMoney
              cents={stats.averageValueCents}
              className="text-ink text-sm font-semibold"
            />
          </dd>
        </div>
      </dl>

      {/* Suma pod kreską — jak „Razem netto" w wycenie. */}
      <div className="mt-2 border-t border-[rgba(20,22,28,0.18)] pt-4">
        <p className="text-ink-soft text-sm">{pl.dashboard.sentToClients}</p>
        <p className="mt-1.5">
          <CountMoney
            cents={stats.sentValueCents}
            className="text-ink text-[34px] leading-none font-semibold tracking-tight"
          />
        </p>
      </div>

      <div className="border-hair mt-6 border-t pt-4">
        <p className="text-ink-soft text-sm">{pl.dashboard.responses}</p>
        <ResponsesRow stats={stats} settled={settled} />
      </div>
    </section>
  );
}

function ResponsesRow({ stats, settled }: { stats: DashboardStats; settled: SettledCounts }) {
  if (settled.settled === 0) {
    if (stats.quotesThisMonth === 0) {
      return (
        <p className="text-ink-soft mt-1.5 text-sm">
          {pl.dashboard.monthEmptyHint}{' '}
          <Link
            to={routes.quoteNew}
            className="text-ink focus-visible:outline-ring rounded-sm underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {pl.quotes.new}
          </Link>
        </p>
      );
    }
    return <p className="text-ink-soft mt-1.5 text-sm">{pl.dashboard.noResponses}</p>;
  }

  return (
    <div className="mt-2.5 flex items-center gap-3">
      <SettledDots accepted={settled.accepted} rejected={settled.rejected} />
      <span className="text-ink text-sm">
        {pl.dashboard.settledOnYes(settled.accepted, settled.settled)}
      </span>
      <CountPercent
        ratio={stats.acceptanceRate ?? 0}
        className="tabular text-ink ml-auto text-lg font-semibold"
      />
    </div>
  );
}

/**
 * Każde rozstrzygnięcie jako kropka: pełna = TAK, pusta = NIE.
 * Wypełnienie, nie barwa — to samo rozróżnienie działa dla osób
 * nierozróżniających kolorów. Czysto wizualne wsparcie tekstu obok,
 * stąd `aria-hidden`.
 */
function SettledDots({ accepted, rejected }: { accepted: number; rejected: number }) {
  const total = accepted + rejected;
  if (total > MAX_DOTS) return null;

  return (
    <span aria-hidden className="flex items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={
            index < accepted
              ? 'bg-ink size-2 rounded-full'
              : 'border-ink/30 size-2 rounded-full border'
          }
        />
      ))}
    </span>
  );
}

function CountInt({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <span className="tabular text-ink text-sm font-semibold">{Math.round(animated)}</span>;
}

function CountMoney({ cents, className }: { cents: number; className?: string }) {
  const animated = useCountUp(cents);
  return <Money cents={Math.round(animated)} className={className} />;
}

function CountPercent({ ratio, className }: { ratio: number; className?: string }) {
  const animated = useCountUp(ratio * 100);
  return <span className={className}>{Math.round(animated)}%</span>;
}
