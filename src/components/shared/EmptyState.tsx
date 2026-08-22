import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'card-surface flex flex-col items-center justify-center px-8 py-16 text-center',
        className,
      )}
    >
      {Icon ? (
        <div className="bg-surface-2 text-ink-soft mb-4 flex size-12 items-center justify-center rounded-full">
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <h2 className="text-ink text-base font-semibold">{title}</h2>
      {description ? (
        <p className="text-ink-soft mt-2 max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
