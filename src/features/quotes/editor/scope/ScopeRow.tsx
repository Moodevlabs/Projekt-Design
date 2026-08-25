import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryColor } from '@/domain/library/schema';
import { pricingChoiceFor } from '@/domain/library/units';
import { PRICING_CHOICE_ICONS } from '@/features/library/items/pricing-choice-icons';
import { categorySwatch } from '@/features/library/categories/swatches';
import { libraryRowSummary } from '../components/library-row-summary';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Kolumny tabeli — jedna definicja dla nagłówka i wierszy. */
export const SCOPE_GRID =
  'grid grid-cols-[minmax(0,1fr)_112px] gap-x-3 sm:grid-cols-[minmax(0,1fr)_150px_170px_128px_112px]';

/**
 * Wiersz tabeli „Dodaj usługi” (inspiracja 1): usługa · grupa · sposób
 * wyceny · stawka · „Dodaj”.
 *
 * Każda kolumna odpowiada na inne pytanie **zanim** się kliknie: co to jest,
 * z którego etapu, jak się liczy i ile kosztuje. W popoverze 340 px te
 * informacje musiały siedzieć jedna pod drugą i ginęły.
 */
export function ScopeRow({
  item,
  categoryColor,
  addedCount,
  onAdd,
}: {
  item: LibraryItem;
  categoryColor: LibraryColor | null;
  addedCount: number;
  onAdd: () => void;
}) {
  const summary = libraryRowSummary(item);
  const choice = pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents);
  const Icon = PRICING_CHOICE_ICONS[choice];
  const swatch = categorySwatch(categoryColor);

  return (
    <li
      className={cn(
        SCOPE_GRID,
        'border-hair items-center border-b px-3 py-2.5 transition-colors',
        addedCount > 0 ? 'bg-surface-2' : 'hover:bg-surface-2/60',
      )}
      data-testid="scope-row"
    >
      <div className="min-w-0">
        <div className="text-ink truncate text-sm font-medium">{item.name}</div>
        {item.description ? (
          <div className="text-ink-soft truncate text-xs">{item.description}</div>
        ) : null}
        {/* Na wąskim ekranie grupa i sposób wyceny schodzą pod nazwę. */}
        <div className="text-ink-soft mt-0.5 flex items-center gap-2 text-[11px] sm:hidden">
          <span>{summary.mode}</span>
          {summary.price ? <span className="tabular">· {summary.price}</span> : null}
        </div>
      </div>

      <div className="hidden min-w-0 sm:block">
        <span
          className={cn(
            'inline-block max-w-full truncate rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium',
            swatch ? 'text-ink' : 'border-hair text-ink-soft border',
          )}
          style={swatch ? { backgroundColor: `${swatch}55` } : undefined}
        >
          {item.category || pl.editor.scopeNoGroup}
        </span>
      </div>

      <div className="text-ink-soft hidden min-w-0 items-center gap-1.5 text-xs sm:flex">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{summary.mode}</span>
      </div>

      <div className="text-ink tabular hidden text-right text-sm sm:block">{summary.price}</div>

      <div className="flex items-center justify-end gap-1.5">
        {addedCount > 0 ? (
          <span className="text-ink-soft flex items-center gap-0.5 text-[11px] whitespace-nowrap">
            <Check className="size-3" aria-hidden />
            {addedCount > 1 ? `×${addedCount}` : null}
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant={addedCount > 0 ? 'outline' : 'default'}
          className="h-7 px-2.5"
          aria-label={pl.editor.scopeAddLabel(item.name)}
          onClick={onAdd}
        >
          <Plus className="size-3.5" aria-hidden />
          {pl.editor.scopeAdd}
        </Button>
      </div>
    </li>
  );
}
