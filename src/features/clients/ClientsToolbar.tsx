import { Plus, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clientsCountLabel } from './count-label';
import type { ClientSort } from '@/data/repos/clients.repo';
import type { ClientStatus } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export type ClientStatusFilter = ClientStatus | 'all';

const STATUS_FILTERS: ClientStatusFilter[] = ['active', 'archived', 'all'];
const SORT_OPTIONS: ClientSort[] = ['activity_desc', 'name_asc', 'value_desc', 'created_desc'];

export interface ClientsToolbarProps {
  status: ClientStatusFilter;
  onStatusChange: (next: ClientStatusFilter) => void;
  search: string;
  onSearchChange: (next: string) => void;
  sort: ClientSort;
  onSortChange: (next: ClientSort) => void;
  /** Licznik wyników — wzorzec 3a.1 z 05-UI: pigułki i liczba nad każdą listą. */
  count: number;
  onAdd: () => void;
  onImport: () => void;
}

export function ClientsToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  count,
  onAdd,
  onImport,
}: ClientsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={pl.clients.filterByStatus}
        >
          {STATUS_FILTERS.map((option) => {
            const active = option === status;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onStatusChange(option)}
                className={cn(
                  'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface text-ink-soft border-hair hover:text-ink border',
                )}
              >
                {option === 'all' ? pl.clients.filters.all : pl.clients.filters[option]}
              </button>
            );
          })}
        </div>
        <span className="text-ink-soft text-sm tabular-nums">{clientsCountLabel(count)}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search
            className="text-ink-soft pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={pl.clients.searchPlaceholder}
            aria-label={pl.clients.searchPlaceholder}
            className="w-80 pl-9"
          />
          {search ? (
            <button
              type="button"
              aria-label={pl.clients.clearSearch}
              onClick={() => onSearchChange('')}
              className="text-ink-soft hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 p-1"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <Select value={sort} onValueChange={(next) => onSortChange(next as ClientSort)}>
          <SelectTrigger className="w-52" aria-label={pl.clients.sort.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {pl.clients.sort[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Import stoi OBOK „Dodaj", nie w menu: to jest pierwsza rzecz, jaką
            robi ktoś, kto przenosi się z Excela, i ma być widoczna. */}
        <Button variant="outline" onClick={onImport}>
          <Upload className="size-4" aria-hidden />
          {pl.clients.importAction}
        </Button>

        <Button onClick={onAdd}>
          <Plus className="size-4" aria-hidden />
          {pl.clients.new}
        </Button>
      </div>
    </div>
  );
}
