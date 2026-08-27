import { useEffect, useRef, useState } from 'react';
import { formatMoney, parseMoney } from '@/domain/money';
import { cn } from '@/lib/utils';

/**
 * Pole kwoty (05-UI §5). Przyjmuje „1 200", „1200,50", „1200.5" — parsowanie
 * robi `parseMoney` z domeny. Po opuszczeniu pola formatuje wartość.
 *
 * Wartość trzymamy w **groszach**; string jest tylko reprezentacją do edycji.
 * Niepoprawne wejście przywraca ostatnią dobrą wartość, zamiast zapisywać `NaN`.
 */
export function InlineMoney({
  cents,
  onCommit,
  currency = 'PLN',
  readOnly = false,
  className,
  ariaLabel,
}: {
  cents: number;
  onCommit: (nextCents: number) => void;
  currency?: string;
  readOnly?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(() => formatMoney(cents, currency));
  const [editing, setEditing] = useState(false);
  const committed = useRef(cents);
  // Kopia szkicu w refie — `onBlur` po Escape czytalby stan sprzed `setDraft`
  // (aktualizacje Reacta sa asynchroniczne) i zapisalby cofnieta wartosc.
  const draftRef = useRef(formatMoney(cents, currency));
  const revertedRef = useRef(false);

  const setDraftBoth = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (cents !== committed.current) {
      committed.current = cents;
      if (!editing) setDraftBoth(formatMoney(cents, currency));
    }
  }, [cents, currency, editing]);

  const commit = () => {
    setEditing(false);
    if (revertedRef.current) {
      revertedRef.current = false;
      return;
    }

    const parsed = parseMoney(draftRef.current);
    if (parsed === null) {
      // Śmieci w polu nie mogą wyzerować ceny — wracamy do ostatniej dobrej.
      setDraftBoth(formatMoney(committed.current, currency));
      return;
    }
    if (parsed === committed.current) {
      setDraftBoth(formatMoney(parsed, currency));
      return;
    }
    committed.current = parsed;
    setDraftBoth(formatMoney(parsed, currency));
    onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onFocus={(event) => {
        if (readOnly) return;
        setEditing(true);
        revertedRef.current = false;
        // W edycji pokazujemy samą liczbę — łatwiej nadpisać niż „1 200,00 zł".
        setDraftBoth((committed.current / 100).toFixed(2).replace('.', ','));
        event.currentTarget.select();
      }}
      onChange={(event) => setDraftBoth(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setEditing(false);
          revertedRef.current = true;
          setDraftBoth(formatMoney(committed.current, currency));
          event.currentTarget.blur();
        }
      }}
      className={cn(
        'tabular w-full rounded-[var(--radius-control)] bg-transparent px-2 py-1 text-right',
        'focus:bg-surface-2 focus-visible:ring-ring focus:outline-none focus-visible:ring-2',
        readOnly && 'cursor-default focus:bg-transparent',
        className,
      )}
    />
  );
}
