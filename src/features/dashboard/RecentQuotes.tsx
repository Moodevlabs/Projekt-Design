import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Money, StatusMark } from '@/components/shared';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Ostatnie wyceny — główna kolumna pulpitu. Wiersze rozdzielone włosem,
 * kwoty tabularne przy prawej krawędzi; cały wiersz jest linkiem do edytora.
 */
export function RecentQuotes({
  quotes,
  loading,
  error,
  onRetry,
}: {
  quotes: readonly QuoteSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="card-surface p-6" aria-busy={loading || undefined}>
      <header className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="label-caps text-ink-soft">
          {pl.dashboard.recentQuotes}
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to={routes.quotes}>{pl.common.all}</Link>
        </Button>
      </header>

      {error ? (
        <div>
          <Alert variant="destructive">
            <AlertDescription>{pl.quotes.loadError}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            {pl.common.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ul className="divide-hair divide-y">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <Link
                to={routes.quote(quote.id)}
                className="hover:bg-surface-2/70 focus-visible:outline-ring -mx-3 flex items-center gap-4 rounded-[var(--radius-control)] px-3 py-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink truncate text-sm font-medium">{quote.title}</p>
                  <p className="text-ink-soft mt-0.5 truncate text-xs">
                    {quote.number ?? pl.quotes.noNumber}
                    {quote.clientName ? ` · ${quote.clientName}` : ''}
                  </p>
                </div>
                {/* Stała szerokość, żeby znaczniki trzymały wspólną oś —
                    to one są kotwicą wzroku przy skanowaniu listy. */}
                <StatusMark status={quote.status} className="w-[9.5rem] shrink-0" />
                <Money
                  cents={quote.totalNetCents}
                  currency={quote.currency}
                  className="text-ink w-28 text-right text-sm font-semibold"
                />
                <span className="text-ink-soft w-20 text-right text-xs">
                  {formatRelativeDay(quote.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
