import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Uchwyt przeciągania — sześć kropek w siatce 2×3, jak w prototypie
 * (`lucide-react/GripVertical` jest wyraźnie gęstszy).
 *
 * To **przycisk**, nie ikona: sensor klawiatury z @dnd-kit potrzebuje elementu,
 * na który da się przejść tabem i wcisnąć spację. Stąd też obowiązkowa
 * etykieta — sam obrazek nic nie powie czytnikowi ekranu.
 */
export function DragHandle({
  label,
  className,
  ...props
}: ComponentPropsWithRef<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'cursor-grip flex w-[18px] shrink-0 items-center justify-center text-[var(--doc-ink-soft)]',
        'transition-colors hover:text-[var(--doc-ink)]',
        'focus-visible:ring-ring rounded-[3px] focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 24 24" className="size-[14px]" aria-hidden focusable="false">
        {[6, 12, 18].map((y) =>
          [8, 16].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" />
          )),
        )}
      </svg>
    </button>
  );
}
