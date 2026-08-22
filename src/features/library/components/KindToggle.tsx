import type { ItemKind } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const KINDS: ItemKind[] = ['item', 'discount'];

function kindLabel(kind: ItemKind): string {
  return kind === 'discount' ? pl.library.kindDiscount : pl.library.kindItem;
}

/**
 * Przełącznik rodzaju wpisu: zwykła pozycja albo rabat. Dwa przyciski zamiast
 * `Select`-a — wybór jest binarny, a `aria-pressed` czyta się prościej niż listę.
 */
export function KindToggle({
  value,
  onChange,
  label,
}: {
  value: ItemKind;
  onChange: (kind: ItemKind) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      {KINDS.map((kind) => {
        const active = kind === value;
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(kind)}
            className={cn(
              'rounded-[var(--radius-pill)] px-2.5 py-1 text-xs transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? kind === 'discount'
                  ? 'text-discount border-discount/40 border bg-transparent font-medium'
                  : 'bg-primary text-primary-foreground'
                : 'text-ink-soft border-hair hover:text-ink border',
            )}
          >
            {kindLabel(kind)}
          </button>
        );
      })}
    </div>
  );
}
