import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryColor } from '@/domain/library/schema';
import { pricingChoiceFor } from '@/domain/library/units';
import { libraryRowSummary } from '@/features/quotes/editor/components/library-row-summary';
import { categorySwatch } from '../categories/swatches';
import { PRICING_CHOICE_ICONS } from './pricing-choice-icons';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Kolumny listy — jedna definicja dla nagłówka i wierszy. */
export const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_64px_28px] items-center gap-x-3 lg:grid-cols-[minmax(0,1fr)_160px_170px_128px_64px_28px]';

/**
 * Zwinięty wiersz usługi w bibliotece (T-72, inspiracja 1).
 *
 * Do tej pory każda usługa była rozłożoną kartą edycji — przy 38 wpisach
 * z biblioteki przykładowej lista zamieniała się w ścianę formularzy.
 * Wiersz mówi to, co potrzebne, żeby wpis **odnaleźć i odróżnić** (05-UI
 * §3a.2): nazwa, grupa, sposób wyceny, stawka, czy aktywna. Klik rozwija
 * formularz pod spodem — `children` to dotychczasowa karta.
 */
export function LibraryItemRow({
  item,
  categoryColor,
  expanded,
  onToggle,
  onToggleActive,
  children,
}: {
  item: LibraryItem;
  categoryColor: LibraryColor | null;
  expanded: boolean;
  onToggle: () => void;
  onToggleActive: (active: boolean) => void;
  children: ReactNode;
}) {
  const label = item.name || pl.library.newItemName;
  const summary = libraryRowSummary(item);
  const Icon = PRICING_CHOICE_ICONS[pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents)];
  const swatch = categorySwatch(categoryColor);
  const bodyId = `library-item-body-${item.id}`;

  return (
    <li
      className={cn(
        'border-hair border-b transition-colors',
        expanded ? 'bg-surface-2/50' : 'hover:bg-surface-2/60',
        !item.active && !expanded && 'opacity-70',
      )}
      data-testid="library-item-row"
    >
      <div className={cn(ROW_GRID, 'px-3 py-2.5')}>
        {/*
          Cały tekst wiersza jest przyciskiem rozwijania — cel kliknięcia ma
          być duży. Przełącznik „Aktywna" stoi POZA nim, żeby zmiana stanu
          nie rozwijała formularza (05-UI §3a.3: stan zmienia się z listy).
        */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? pl.library.rowCollapse(label) : pl.library.rowExpand(label)}
          onClick={onToggle}
          className="focus-visible:ring-ring col-span-1 min-w-0 rounded-[var(--radius-control)] text-left focus-visible:ring-2 focus-visible:outline-none lg:col-span-4 lg:grid lg:grid-cols-subgrid lg:items-center lg:gap-x-3"
        >
          <span className="block min-w-0">
            <span className="text-ink flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{label}</span>
              {item.isSample ? (
                <span className="bg-surface-2 text-ink-soft shrink-0 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10.5px] font-normal">
                  {pl.library.sampleBadge}
                </span>
              ) : null}
              {!item.active ? (
                <span className="text-ink-soft shrink-0 text-[10.5px] font-normal">
                  {pl.library.inactiveBadge}
                </span>
              ) : null}
            </span>
            {item.description ? (
              <span className="text-ink-soft block truncate text-xs">{item.description}</span>
            ) : null}
            <span className="text-ink-soft mt-0.5 flex items-center gap-2 text-[11px] lg:hidden">
              <span>{summary.mode}</span>
              {summary.price ? <span className="tabular">· {summary.price}</span> : null}
            </span>
          </span>

          <span className="hidden min-w-0 lg:block">
            <span
              className={cn(
                'inline-block max-w-full truncate rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium',
                swatch ? 'text-ink' : 'border-hair text-ink-soft border',
              )}
              style={swatch ? { backgroundColor: `${swatch}55` } : undefined}
            >
              {item.category || pl.library.withoutCategory}
            </span>
          </span>

          <span className="text-ink-soft hidden min-w-0 items-center gap-1.5 text-xs lg:flex">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{summary.mode}</span>
          </span>

          <span className="text-ink tabular hidden text-right text-sm lg:block">
            {item.kind === 'discount' && summary.price ? `− ${summary.price}` : summary.price}
          </span>
        </button>

        <div className="flex justify-center">
          <Switch
            size="sm"
            checked={item.active}
            onCheckedChange={onToggleActive}
            aria-label={pl.library.rowToggleActive(label)}
          />
        </div>

        <ChevronDown
          aria-hidden
          className={cn(
            'text-ink-soft size-4 justify-self-center transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </div>

      {expanded ? (
        <div id={bodyId} className="px-3 pb-4">
          {children}
        </div>
      ) : null}
    </li>
  );
}
