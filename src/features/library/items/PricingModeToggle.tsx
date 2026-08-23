import type { PricingRule } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type Mode = PricingRule['mode'];

const MODES: { value: Mode; label: string }[] = [
  { value: 'flat', label: pl.library.pricingFlat },
  { value: 'per_room', label: pl.library.pricingPerRoom },
  { value: 'per_frame', label: pl.library.pricingPerFrame },
];

/**
 * Wybór sposobu wyceny pozycji. Trzy tryby jako segment, bo są rozłączne
 * i widoczne naraz — dropdown chowałby przed użytkownikiem to, że cennik
 * parametryczny w ogóle istnieje.
 */
export function PricingModeToggle({
  value,
  onChange,
  label,
}: {
  value: Mode;
  onChange: (mode: Mode) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="border-hair flex rounded-[var(--radius-pill)] border p-0.5">
      {MODES.map((mode) => {
        const active = mode.value === value;
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mode.value)}
            className={cn(
              'flex-1 rounded-[var(--radius-pill)] px-2 py-1 text-xs transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active ? 'bg-primary text-primary-foreground font-medium' : 'text-ink-soft hover:text-ink',
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
