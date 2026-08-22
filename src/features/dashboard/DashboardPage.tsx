import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState, Money, PageSection, StatusBadge } from '@/components/shared';
import { StatTile } from './StatTile';
import { SubscriptionCard } from './SubscriptionCard';
import { calcDashboardStats } from './stats';
import { useQuotesList } from '@/data/queries/useQuotes';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const RECENT_COUNT = 5;

export function DashboardPage() {
  // Jedno zapytanie zasila i kafle, i listę „ostatnie wyceny" — statystyki
  // liczymy z tego, co i tak jest w cache, zamiast bić po bazie drugi raz.
  const quotes = useQuotesList({ sort: 'updated_desc' });
  const rows = useMemo(() => quotes.data ?? [], [quotes.data]);
  const stats = useMemo(() => calcDashboardStats(rows), [rows]);

  const recent = rows.slice(0, RECENT_COUNT);
  const loading = quotes.isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={pl.dashboard.quotesThisMonth}
          value={stats.quotesThisMonth}
          loading={loading}
        />
        <StatTile
          label={pl.dashboard.sentValue}
          value={<Money cents={stats.sentValueCents} />}
          hint={pl.dashboard.thisMonth}
          loading={loading}
        />
        <StatTile
          label={pl.dashboard.acceptanceRate}
          value={
            stats.acceptanceRate === null ? '—' : `${Math.round(stats.acceptanceRate * 100)}%`
          }
          hint={stats.acceptanceRate === null ? pl.dashboard.noAcceptanceData : undefined}
          loading={loading}
        />
        <StatTile
          label={pl.dashboard.averageValue}
          value={<Money cents={stats.averageValueCents} />}
          hint={pl.dashboard.thisMonth}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <PageSection
          title={pl.dashboard.recentQuotes}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to={routes.quotes}>{pl.common.all}</Link>
            </Button>
          }
        >
          {quotes.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{pl.quotes.loadError}</AlertDescription>
            </Alert>
          ) : loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={pl.quotes.emptyTitle}
              description={pl.quotes.emptyDescription}
              className="shadow-none"
              action={
                <Button asChild>
                  <Link to={routes.quoteNew}>
                    <Plus className="size-4" aria-hidden />
                    {pl.quotes.new}
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-hair divide-y">
              {recent.map((quote) => (
                <li key={quote.id}>
                  <Link
                    to={routes.quote(quote.id)}
                    className="hover:bg-surface-2 -mx-2 flex items-center gap-4 rounded-[var(--radius-control)] px-2 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-ink truncate text-sm font-medium">{quote.title}</p>
                      <p className="text-ink-soft truncate text-xs">
                        {quote.number ?? pl.quotes.noNumber}
                        {quote.clientName ? ` · ${quote.clientName}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                    <Money
                      cents={quote.totalNetCents}
                      currency={quote.currency}
                      className="w-28 text-right text-sm"
                    />
                    <span className="text-ink-soft w-24 text-right text-xs">
                      {formatRelativeDay(quote.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PageSection>

        <SubscriptionCard />
      </div>
    </div>
  );
}
