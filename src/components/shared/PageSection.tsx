import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Karta-sekcja strony: tytuł + opcjonalna akcja po prawej. */
export function PageSection({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card-surface p-6', className)}>
      {title || action ? (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title ? <h2 className="text-ink text-sm font-semibold">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
