import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Money, StatusMark } from '@/components/shared';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Ostatnie wyceny — jedyna biała kartka na pulpicie (T-133).
 *
 * Prawdziwa tabela z kolumnami, nie lista wierszy: numer, dokument z klientem
 * pod spodem, status naszym znacznikiem, kwota do prawej, data. Kartka jest
 * tu na miejscu, bo to dokumenty — reszta pulpitu leży na kanwie.
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
    <section className="card-surface overflow-hidden" aria-busy={loading || undefined}>
      <header className="border-hair flex items-baseline justify-between gap-4 border-b px-[18px] pt-3.5 pb-3">
        <h2 className="text-ink text-[13px] font-semibold">{pl.dashboard.recentQuotes}</h2>
        <Link to={routes.quotes} className="text-ink-soft hover:text-ink text-[12.5px] font-medium">
          {pl.dashboard.recentQuotesAll}
        </Link>
      </header>

      {error ? (
        <div className="p-[18px]">
          <Alert variant="destructive">
            <AlertDescription>{pl.quotes.loadError}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            {pl.common.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3 p-[18px]">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2">
              <TableHead className="w-44 px-[18px]">{pl.dashboard.colNumber}</TableHead>
              <TableHead>{pl.dashboard.colDocument}</TableHead>
              <TableHead className="w-44">{pl.dashboard.colStatus}</TableHead>
              <TableHead className="w-36 text-right">{pl.dashboard.colNet}</TableHead>
              <TableHead className="w-28 px-[18px] text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="text-ink-soft px-[18px] text-[12.5px] whitespace-nowrap tabular-nums">
                  {quote.number ?? pl.quotes.noNumber}
                  {quote.version > 1 ? ` · v${quote.version}` : ''}
                </TableCell>
                <TableCell className="max-w-0">
                  <Link
                    to={routes.quote(quote.id)}
                    className="text-ink block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {quote.title}
                  </Link>
                  {quote.clientName ? (
                    <span className="text-ink-soft block truncate text-[12.5px]">
                      {quote.clientName}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <StatusMark status={quote.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Money
                    cents={quote.totalNetCents}
                    currency={quote.currency}
                    className="text-ink text-sm font-semibold whitespace-nowrap"
                  />
                </TableCell>
                <TableCell className="text-ink-faint px-[18px] text-right text-[12.5px] whitespace-nowrap">
                  {formatRelativeDay(quote.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
