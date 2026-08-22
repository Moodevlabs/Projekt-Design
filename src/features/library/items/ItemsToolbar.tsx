import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type ItemsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  /** `null` = wszystkie kategorie. */
  category: string | null;
  onCategoryChange: (category: string | null) => void;
  onAdd: () => void;
  adding?: boolean;
};

/**
 * Filtry biblioteki. Trafiają do zapytania (patrz `useLibraryItems`), więc
 * szuka i filtruje Postgres — biblioteka ma rosnąć do setek pozycji.
 */
export function ItemsToolbar({
  search,
  onSearchChange,
  categories,
  category,
  onCategoryChange,
  onAdd,
  adding = false,
}: ItemsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={pl.library.filterByCategory}
      >
        {[null, ...categories].map((option) => {
          const active = option === category;
          return (
            <button
              key={option ?? '__all__'}
              type="button"
              aria-pressed={active}
              onClick={() => onCategoryChange(option)}
              className={cn(
                'rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-ink-soft border-hair hover:text-ink border',
              )}
            >
              {option ?? pl.common.all}
            </button>
          );
        })}
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
            placeholder={pl.library.searchPlaceholder}
            aria-label={pl.library.searchPlaceholder}
            className="w-72 pl-9"
          />
          {search ? (
            <button
              type="button"
              aria-label={pl.library.clearSearch}
              onClick={() => onSearchChange('')}
              className="text-ink-soft hover:text-ink absolute top-1/2 right-2 -translate-y-1/2 p-1"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <Button type="button" onClick={onAdd} disabled={adding}>
          <Plus className="size-4" aria-hidden />
          {pl.library.addItem}
        </Button>
      </div>
    </div>
  );
}
