import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddLinkProps = React.ComponentProps<'button'> & { icon?: LucideIcon };

/**
 * „+ Dodaj …" — w prototypie to **linki**, nie przyciski: bez ramki, bez tła,
 * 12.5 px, półgrube, w kolorze sage. Trzymamy ten ton, bo dzięki temu edytor
 * nie wygląda jak panel administracyjny.
 *
 * Reszta propsów (z `ref` włącznie) leci na `<button>`, bo `AddLink` bywa
 * dzieckiem `PopoverTrigger asChild` — Radix podaje przez `Slot` swój ref
 * i atrybuty stanu. Komponent, który je zjada, zostawia popover bez kotwicy:
 * stan się przełącza, ale zawartość nie ma się do czego zaczepić i na ekranie
 * nie dzieje się nic.
 */
export function AddLink({ icon: Icon, children, className, ...rest }: AddLinkProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-[3px] text-[12.5px] font-semibold',
        'text-[var(--doc-sage)] transition-colors hover:text-[var(--doc-ink)]',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : <span aria-hidden>+</span>}
      {children}
    </button>
  );
}
