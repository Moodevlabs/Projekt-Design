import { Link } from 'react-router-dom';
import { Download, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/** Wartość „wszystkie miasta" — Radix Select nie przyjmuje pustego stringa. */
export const ALL_CITIES = '__all__';

/** To samo dla filtra klienta (T-53). */
export const ALL_CLIENTS = '__all__';

function statusLabel(status: StatusFilter): string {
  return status === 'all' ? pl.common.all : pl.status[status];
}

export interface QuotesToolbarProps {
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
  search: string;
  onSearchChange: (next: string) => void;
  city: string;
  onCityChange: (next: string) => void;
  cities: string[];
  clientId: string;
  onClientChange: (next: string) => void;
  clients: { id: string; name: string }[];
  sort: QuoteSort;
  onSortChange: (next: QuoteSort) => void;
  onExport: () => void;
  exporting: boolean;
}

export function QuotesToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  city,
  onCityChange,
  cities,
  clientId,
  onClientChange,
  clients,
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

        <Select value={city} onValueChange={onCityChange}>
          <SelectTrigger className="w-44" aria-label={pl.quotes.filterByCity}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CITIES}>{pl.quotes.allCities}</SelectItem>
            {cities.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clientId} onValueChange={onClientChange}>
          <SelectTrigger className="w-48" aria-label={pl.quotes.filterByClient}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLIENTS}>{pl.quotes.allClients}</SelectItem>
            {clients.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Button variant="outline" onClick={onExport} disabled={exporting}>
          <Download className="size-4" aria-hidden />
          {pl.quotes.exportRegister}
        </Button>

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
