import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categorySwatch } from '../categories/swatches';
import { categoryLabel, type LibraryCategory } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type ItemsToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  /** Słownik grup (T-59) — pigułki idą w JEGO kolejności, nie alfabetycznie. */
  categories: LibraryCategory[];
  /** `null` = wszystkie grupy, `'none'` = usługi bez grupy. */
  categoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  /** Licznik wyników nad listą — wzorzec 3a.1 z 05-UI. */
  count: number;
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
  categoryId,
  onCategoryChange,
  count,
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
        <Pill active={categoryId === null} onClick={() => onCategoryChange(null)}>
          {pl.common.all}
        </Pill>
        {categories.map((option) => (
          <Pill
            key={option.id}
            active={categoryId === option.id}
            color={categorySwatch(option.color)}
            onClick={() => onCategoryChange(option.id)}
          >
            {categoryLabel(option)}
          </Pill>
        ))}
        {/* „Bez grupy" to nie grupa, tylko stan — usługi lądują w nim po
            usunięciu działu i muszą dać się odfiltrować. */}
        <Pill active={categoryId === 'none'} onClick={() => onCategoryChange('none')}>
          {pl.library.withoutCategory}
        </Pill>
        <span className="text-ink-soft ml-1 text-sm tabular-nums">
          {pl.library.itemCount(count)}
        </span>
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

/** Pigułka filtra grup — kolor z palety jako kropka, nie jako tło. */
function Pill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-surface text-ink-soft border-hair hover:text-ink border',
      )}
    >
      {color ? (
        <span
          aria-hidden
          style={{ backgroundColor: color }}
          className="size-2 shrink-0 rounded-full"
        />
      ) : null}
      {children}
    </button>
  );
}
