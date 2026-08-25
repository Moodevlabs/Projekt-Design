import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Filtr kategorii nad listą pickera (T-70, inspiracja 1).
 *
 * Picker grupował usługi po kategorii, ale nie pozwalał zawęzić — przy
 * bibliotece przykładowej (38 usług w 8 grupach) trzeba było scrollować przez
 * cudze etapy, żeby dojść do swojego. Pigułki zamieniają to w jedno kliknięcie.
 *
 * Pasek **przewija się w poziomie**, a nie zawija do trzech rzędów: popover ma
 * stałą szerokość, a lista usług jest tym, po co się go otwiera.
 */
export function CategoryPills({
  categories,
  value,
  onChange,
}: {
  categories: string[];
  /** `null` = „Wszystkie”. */
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label={pl.library.categories}
      className="border-hair flex gap-1 overflow-x-auto border-b px-2 py-1.5"
    >
      <Pill label={pl.editor.pickerAllCategories} active={value === null} onClick={() => onChange(null)} />
      {categories.map((category) => (
        <Pill
          key={category}
          label={category}
          active={value === category}
          onClick={() => onChange(value === category ? null : category)}
        />
      ))}
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs whitespace-nowrap transition-colors',
        active
          ? 'bg-primary text-primary-foreground font-medium'
          : 'border-hair text-ink-soft hover:text-ink border',
      )}
    >
      {label}
    </button>
  );
}
