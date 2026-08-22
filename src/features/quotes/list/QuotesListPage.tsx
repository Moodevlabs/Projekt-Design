import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState, Money, StatusMark } from '@/components/shared';
import { QuoteRowMenu } from './QuoteRowMenu';
import { useQuotesList } from '@/data/queries/useQuotes';
import type { QuoteSort } from '@/data/repos/quotes.repo';
import { QuoteStatusSchema, type QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type StatusFilter = QuoteStatus | 'all';

const STATUS_FILTERS: StatusFilter[] = ['all', ...QuoteStatusSchema.options];
const SORT_OPTIONS: QuoteSort[] = ['updated_desc', 'created_desc', 'total_desc', 'number_asc'];

function statusLabel(status: StatusFilter): string {
  return status === 'all' ? pl.common.all : pl.status[status];
}

function FilterPills({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={pl.quotes.filterByStatus}>
      {STATUS_FILTERS.map((status) => {
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(status)}
            className={cn(
              'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-ink-soft border-hair hover:text-ink border',
            )}
          >
            {statusLabel(status)}
          </button>
        );
      })}
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={7}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function QuotesListPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<QuoteSort>('updated_desc');
  const [search, setSearch] = useState('');

  // Filtry idą do zapytania, więc filtrowanie i sortowanie robi Postgres,
  // a nie przeglądarka — lista może urosnąć do tysięcy wycen.
  const filters = useMemo(
    () => ({ status, sort, search: search.trim() || undefined }),
    [status, sort, search],
  );
  const quotes = useQuotesList(filters);

  const hasFilters = status !== 'all' || search.trim().length > 0;
  const rows = quotes.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterPills value={status} onChange={setStatus} />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="text-ink-soft pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={pl.quotes.searchPlaceholder}
              aria-label={pl.quotes.searchPlaceholder}
              className="w-72 pl-9"
            />
            {search ? (
              <button
                type="button"
                aria-label={pl.quotes.clearSearch}
                onClick={() => setSearch('')}
                className="text-ink-soft hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 p-1"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          <Select value={sort} onValueChange={(next) => setSort(next as QuoteSort)}>
            <SelectTrigger className="w-48" aria-label={pl.quotes.sort.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {pl.quotes.sort[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild>
            <Link to={routes.quoteNew}>
              <Plus className="size-4" aria-hidden />
              {pl.quotes.new}
            </Link>
          </Button>
        </div>
      </div>

      {quotes.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {pl.quotes.loadError}{' '}
            <button
              type="button"
              onClick={() => void quotes.refetch()}
              className="underline underline-offset-4"
            >
              {pl.common.retry}
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!quotes.isLoading && !quotes.isError && rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? pl.quotes.noResultsTitle : pl.quotes.emptyTitle}
          description={
            hasFilters ? pl.quotes.noResultsDescription : pl.quotes.emptyDescription
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('all');
                  setSearch('');
                }}
              >
                {pl.common.all}
              </Button>
            ) : (
              <Button asChild>
                <Link to={routes.quoteNew}>
                  <Plus className="size-4" aria-hidden />
                  {pl.quotes.new}
                </Link>
              </Button>
            )
          }
        />
      ) : null}

      {quotes.isLoading || rows.length > 0 ? (
        <div className="card-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-40">{pl.quotes.number}</TableHead>
                <TableHead>{pl.quotes.quoteTitle}</TableHead>
                <TableHead className="w-48">{pl.quotes.client}</TableHead>
                <TableHead className="w-32">{pl.quotes.statusColumn}</TableHead>
                <TableHead className="w-36 text-right">{pl.quotes.total}</TableHead>
                <TableHead className="w-36">{pl.quotes.updated}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.isLoading ? (
                <LoadingRows />
              ) : (
                rows.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="tabular font-medium">
                      <Link
                        to={routes.quote(quote.id)}
                        className="hover:underline underline-offset-4"
                      >
                        {quote.number ?? pl.quotes.noNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-0 truncate">
                      <Link
                        to={routes.quote(quote.id)}
                        className="hover:underline underline-offset-4"
                      >
                        {quote.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-soft max-w-0 truncate">
                      {quote.clientName ?? pl.quotes.noClient}
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
                      <QuoteRowMenu quoteId={quote.id} title={quote.title} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
