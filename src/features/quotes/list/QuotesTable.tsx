import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Money, StatusMark } from '@/components/shared';
import { QuoteRowMenu } from './QuoteRowMenu';
import { QuoteNotesPopover } from './QuoteNotesPopover';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/** Liczba kolumn — trzyma `colSpan` szkieletu w zgodzie z nagłówkiem. */
const COLUMNS = 9;

export function QuotesTable({ rows, loading }: { rows: QuoteSummary[]; loading: boolean }) {
  return (
    <div className="card-surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-40">{pl.quotes.number}</TableHead>
            <TableHead>{pl.quotes.quoteTitle}</TableHead>
            <TableHead className="w-48">{pl.quotes.client}</TableHead>
            <TableHead className="w-36">{pl.quotes.cityColumn}</TableHead>
            <TableHead className="w-32">{pl.quotes.statusColumn}</TableHead>
            <TableHead className="w-36 text-right">{pl.quotes.total}</TableHead>
            <TableHead className="w-36">{pl.quotes.updated}</TableHead>
            <TableHead className="w-10" />
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : (
            rows.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="tabular font-medium">
                  <Link to={routes.quote(quote.id)} className="underline-offset-4 hover:underline">
                    {quote.number ?? pl.quotes.noNumber}
                  </Link>
                </TableCell>
                <TableCell className="max-w-0 truncate">
                  <Link to={routes.quote(quote.id)} className="underline-offset-4 hover:underline">
                    {quote.title}
                  </Link>
                </TableCell>
                <TableCell className="text-ink-soft max-w-0 truncate">
                  {/* Link tylko wtedy, gdy wycena jest przypieta do kartoteki.
                      Sama nazwa w `client_name` to snapshot z dokumentu —
                      klikalna prowadzilaby donikad. */}
                  {quote.clientId ? (
                    <Link
                      to={routes.client(quote.clientId)}
                      aria-label={pl.quotes.openClient(quote.clientName ?? pl.quotes.noClient)}
                      className="underline-offset-4 hover:underline"
                    >
                      {quote.clientName ?? pl.quotes.noClient}
                    </Link>
                  ) : (
                    (quote.clientName ?? pl.quotes.noClient)
                  )}
                </TableCell>
                <TableCell className="text-ink-soft max-w-0 truncate">
                  {quote.city ?? pl.quotes.noCity}
                </TableCell>
                <TableCell>
                  <StatusMark status={quote.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Money cents={quote.totalNetCents} currency={quote.currency} />
                </TableCell>
                <TableCell className="text-ink-soft text-sm">
                  {formatRelativeDay(quote.updatedAt)}
                </TableCell>
                <TableCell>
                  <QuoteNotesPopover
                    quoteId={quote.id}
                    title={quote.title}
                    notes={quote.internalNotes}
                    docKind={quote.docKind}
                  />
                </TableCell>
                <TableCell>
                  <QuoteRowMenu quoteId={quote.id} title={quote.title} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={COLUMNS}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
