import { useEffect, useRef, useState } from 'react';
import { formatMoney, parseMoney } from '@/domain/money';
import { cn } from '@/lib/utils';

/**
 * Pole kwoty (05-UI §5). Przyjmuje „1 200", „1200,50", „1200.5" — parsowanie
 * robi `parseMoney` z domeny. Po opuszczeniu pola formatuje wartość.
 *
 * Wartość trzymamy w **groszach**; string jest tylko reprezentacją do edycji.
 * Niepoprawne wejście przywraca ostatnią dobrą wartość, zamiast zapisywać `NaN`.
 *
 * `nullable` (T-115): `cents: null` = „wycena indywidualna" — pole jest wtedy
 * PUSTE z podpowiedzią, a nie „0,00 zł" (zero znaczy „gratis"). Wpisanie
 * kwoty nadaje cenę, wyczyszczenie pola wraca do `null`. Bez `nullable`
 * puste pole traktujemy jak śmieci i przywracamy ostatnią dobrą wartość.
 */
export function InlineMoney({
  cents,
  onCommit,
  currency = 'PLN',
  readOnly = false,
  nullable = false,
  onClear,
  placeholder,
  className,
  ariaLabel,
}: {
  cents: number | null;
  onCommit: (nextCents: number) => void;
  currency?: string;
  readOnly?: boolean;
  /** Pozwala wyczyścić pole do `null` („wycena indywidualna") — woła `onClear`. */
  nullable?: boolean;
  onClear?: () => void;
  /** Podpowiedź w pustym polu — tylko sensowna z `nullable`. */
  placeholder?: string;
  className?: string;
  ariaLabel: string;
}) {
  const format = (value: number | null) => (value === null ? '' : formatMoney(value, currency));
  const [draft, setDraft] = useState(() => format(cents));
  const [editing, setEditing] = useState(false);
  const committed = useRef<number | null>(cents);
  // Kopia szkicu w refie — `onBlur` po Escape czytalby stan sprzed `setDraft`
  // (aktualizacje Reacta sa asynchroniczne) i zapisalby cofnieta wartosc.
  const draftRef = useRef(format(cents));
  const revertedRef = useRef(false);

  const setDraftBoth = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (cents !== committed.current) {
      committed.current = cents;
      if (!editing) setDraftBoth(cents === null ? '' : formatMoney(cents, currency));
    }
  }, [cents, currency, editing]);

  const commit = () => {
    setEditing(false);
    if (revertedRef.current) {
      revertedRef.current = false;
      return;
    }

    const blank = draftRef.current.trim() === '';
    // Puste pole w trybie `nullable` to świadome „ustalimy osobno".
    const clearing = blank && nullable;
    const parsed = clearing ? null : parseMoney(draftRef.current);
    if (parsed === null && !clearing) {
      // Śmieci w polu nie mogą wyzerować ceny — wracamy do ostatniej dobrej.
      setDraftBoth(format(committed.current));
      return;
    }
    if (parsed === committed.current) {
      setDraftBoth(format(parsed));
      return;
    }
    committed.current = parsed;
    setDraftBoth(format(parsed));
    if (parsed === null) onClear?.();
    else onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onFocus={(event) => {
        if (readOnly) return;
        setEditing(true);
        revertedRef.current = false;
        // W edycji pokazujemy samą liczbę — łatwiej nadpisać niż „1 200,00 zł".
        setDraftBoth(
          committed.current === null ? '' : (committed.current / 100).toFixed(2).replace('.', ','),
        );
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
          setDraftBoth(format(committed.current));
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
