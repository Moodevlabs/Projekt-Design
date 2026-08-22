import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * „+ Dodaj …" — w prototypie to **linki**, nie przyciski: bez ramki, bez tła,
 * 12.5 px, półgrube, w kolorze sage. Trzymamy ten ton, bo dzięki temu edytor
 * nie wygląda jak panel administracyjny.
 */
export function AddLink({
  icon: Icon,
  children,
  onClick,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-[3px] text-[12.5px] font-semibold',
        'text-[var(--doc-sage)] transition-colors hover:text-[var(--doc-ink)]',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : <span aria-hidden>+</span>}
      {children}
    </button>
  );
}
