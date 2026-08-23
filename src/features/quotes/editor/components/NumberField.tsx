import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Małe pole liczbowe, które **da się wyczyścić i wpisać od nowa**.
 *
 * Naiwna wersja (`value={liczba}` plus `onChange` odrzucający niepoprawne
 * wejście) wygląda poprawnie, a jest nie do użycia: skasowanie zawartości daje
 * pusty string, ten nie przechodzi walidacji, więc React natychmiast
 * przywraca starą liczbę — i kolejna wpisana cyfra dokleja się do niej
 * („5" → „56"), zamiast ją zastąpić.
 *
 * Dlatego trzymamy **szkic jako tekst**: pole może być chwilowo puste albo
 * niedokończone, a w górę idzie tylko wartość, która przeszła walidację.
 * Utrata ogniskowania przywraca to, co faktycznie zapisano — bez tego pole
 * zostawałoby puste, sugerując wartość, której nie ma.
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  step = 1,
  ariaLabel,
  disabled = false,
  className,
}: {
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  // Wartość może zmienić się z zewnątrz (przeładowanie, cofnięcie, kaskada).
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);

        const next = Number(raw);
        if (raw.trim() === '' || !Number.isFinite(next)) return;
        if (next < min || (max !== undefined && next > max)) return;
        onCommit(next);
      }}
      onBlur={() => setDraft(String(value))}
      className={cn(
        'border-hair focus-within:border-ring tabular rounded-[var(--radius-control)] border px-1.5 py-0.5 text-right outline-none',
        className,
      )}
    />
  );
}
