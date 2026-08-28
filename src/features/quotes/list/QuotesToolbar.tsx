import { Link } from 'react-router-dom';
import { Download, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { QuoteSort } from '@/data/repos/quotes.repo';
import { QuoteStatusSchema, type QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export type StatusFilter = QuoteStatus | 'all';

const STATUS_FILTERS: StatusFilter[] = ['all', ...QuoteStatusSchema.options];
const SORT_OPTIONS: QuoteSort[] = ['updated_desc', 'created_desc', 'total_desc', 'number_asc'];

function statusLabel(status: StatusFilter): string {
  return status === 'all' ? pl.common.all : pl.status[status];
}

export interface QuotesToolbarProps {
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
  search: string;
  onSearchChange: (next: string) => void;
  sort: QuoteSort;
  onSortChange: (next: QuoteSort) => void;
  onExport: (format: 'csv' | 'xlsx') => void;
  exporting: boolean;
}

export function QuotesToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  onExport,
  exporting,
}: QuotesToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterPills value={status} onChange={onStatusChange} />

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search
            className="text-ink-soft pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={pl.quotes.searchPlaceholder}
            aria-label={pl.quotes.searchPlaceholder}
            className="w-72 pl-9"
          />
          {search ? (
            <button
              type="button"
              aria-label={pl.quotes.clearSearch}
              onClick={() => onSearchChange('')}
              className="text-ink-soft hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 p-1"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {/*
          Bez list „miasto" i „klient" (2026-08-28, decyzja wlasciciela):
          jedna wyszukiwarka obejmuje numer, tytul, klienta i miasto, a dwa
          dodatkowe selecty tylko rozpychaly pasek.
        */}
        <Select value={sort} onValueChange={(next) => onSortChange(next as QuoteSort)}>
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

        {/*
          Dwa formaty w jednym menu, a nie dwa przyciski obok siebie: to jest
          ta sama akcja w dwóch wariantach, a nie dwie akcje.
        */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exporting}>
              <Download className="size-4" aria-hidden />
              {pl.quotes.exportRegister}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onExport('xlsx')}>
              {pl.quotes.exportXlsx}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport('csv')}>
              {pl.quotes.exportCsv}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild>
          <Link to={routes.quoteNew}>
            <Plus className="size-4" aria-hidden />
            {pl.quotes.new}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function FilterPills({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={pl.quotes.filterByStatus}
    >
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
