import { cn } from '@/lib/utils';

/**
 * Przełącznik TAK/NIE (46×26). Odwzorowanie kontrolki z prototypu — to jest
 * sedno produktu, więc trzymamy jej wymiary i czas animacji (180 ms).
 *
 * Działa **także w trybie podglądu**: klient dostaje wycenę i sam odklikuje zakres.
 */
export function ItemToggle({
  checked,
  onChange,
  label,
  /** Stan pośredni dla grupy: część pozycji włączona. */
  indeterminate = false,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-[180ms] ease-out',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        checked || indeterminate
          ? 'bg-[var(--doc-sage)]'
          : 'bg-[var(--doc-toggle-off)]',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-[3px] size-5 rounded-full bg-white transition-[left] duration-[180ms] ease-out',
          checked ? 'left-[23px]' : indeterminate ? 'left-[13px]' : 'left-[3px]',
        )}
      />
    </button>
  );
}
