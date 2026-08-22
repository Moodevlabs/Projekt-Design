import { formatMoney } from '@/domain/money';
import { cn } from '@/lib/utils';

type MoneyProps = {
  cents: number;
  currency?: string;
  /** Rabaty prezentujemy na terakotowo i ze znakiem minus. */
  variant?: 'default' | 'discount' | 'muted';
  className?: string;
};

export function Money({ cents, currency = 'PLN', variant = 'default', className }: MoneyProps) {
  const value = variant === 'discount' ? -Math.abs(cents) : cents;

  return (
    <span
      className={cn(
        'tabular whitespace-nowrap',
        variant === 'discount' && 'text-discount',
        variant === 'muted' && 'text-ink-soft',
        className,
      )}
    >
      {formatMoney(value, currency)}
    </span>
  );
}
