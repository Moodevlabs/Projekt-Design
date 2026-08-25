import { PRICING_CHOICES, type PricingChoiceId } from '@/domain/library/units';
import { PRICING_CHOICE_ICONS as ICONS } from './pricing-choice-icons';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * „Sposób wyceny" — **jeden wybór**, osiem kafelków (koncepcja §5 reguła 1).
 *
 * Pod spodem to nie osiem algorytmów, tylko trzy tryby liczenia skrzyżowane
 * z jednostką: „Za m²" to `flat` + `m2`, a „Indywidualnie" to `flat` z ceną
 * `null`. Użytkownik nie musi o tym wiedzieć — i o to chodzi. Rozbicie tego
 * na dwie kontrolki („tryb" + „jednostka") zmuszałoby go do tłumaczenia
 * swojej intencji na nasz model.
 */
export function PricingChoicePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: PricingChoiceId;
  onChange: (next: PricingChoiceId) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      role="radiogroup"
      aria-label={pl.library.pricingChoice}
    >
      {PRICING_CHOICES.map((choice) => {
        const Icon = ICONS[choice.id];
        const active = value === choice.id;

        return (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(choice.id)}
            className={cn(
              'flex flex-col items-start gap-1.5 rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              active
                ? 'border-primary bg-primary/5 text-ink'
                : 'border-hair text-ink-soft hover:text-ink hover:bg-surface-2',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="text-sm font-medium">{pl.library.pricingChoices[choice.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
