import { useEffect, useState } from 'react';
import { formatMoney, parseMoney } from '@/domain/money';
import { cn } from '@/lib/utils';

type MoneyInputProps = {
  /** Wartość w groszach — jedyna prawda. Tekst w polu jest tylko reprezentacją. */
  cents: number;
  onChange: (cents: number) => void;
  ariaLabel: string;
  currency?: string;
  /** Rabat pokazujemy ze znakiem „−” i w terakocie, ale trzymamy dodatnio (jak w domenie). */
  discount?: boolean;
  className?: string;
};

/**
 * Pole kwoty biblioteki. Zamianę tekstu na grosze robi wyłącznie `parseMoney`,
 * a wyświetlanie — `formatMoney`; komponent nie zna się na formatach liczb.
 *
 * W trakcie edycji pokazujemy samą liczbę („1200,50”), po wyjściu z pola pełny
 * format z walutą. Wejście, którego nie da się zinterpretować, po prostu nie
 * zmienia wartości — nie ma prawa wyzerować ceny.
 */
export function MoneyInput({
  cents,
  onChange,
  ariaLabel,
  currency = 'PLN',
  discount = false,
  className,
}: MoneyInputProps) {
  const [draft, setDraft] = useState(() => formatMoney(cents, currency));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // Poza edycją pole jest lustrem wartości; w edycji nie wolno ruszać tekstu
    // pod palcami użytkownika.
    if (!editing) setDraft(formatMoney(cents, currency));
  }, [cents, currency, editing]);

  return (
    <div
      className={cn(
        'border-hair focus-within:border-ring flex items-center gap-1 rounded-[var(--radius-control)] border px-2 py-1',
        discount && 'text-discount',
        className,
      )}
    >
      {discount ? (
        <span aria-hidden className="tabular text-sm">
          −
        </span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        aria-label={ariaLabel}
        onFocus={(event) => {
          setEditing(true);
          setDraft((cents / 100).toFixed(2).replace('.', ','));
          event.currentTarget.select();
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = parseMoney(next);
          if (parsed === null) return;
          onChange(discount ? Math.abs(parsed) : parsed);
        }}
        onBlur={() => {
          setEditing(false);
          setDraft(formatMoney(cents, currency));
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="tabular w-full bg-transparent text-right text-sm outline-none"
      />
    </div>
  );
}
