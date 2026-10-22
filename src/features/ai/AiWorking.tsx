import { Sparkles } from 'lucide-react';

import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Stan „asystent pracuje" — wywołanie modelu trwa kilka–kilkanaście sekund,
 * więc potrzebuje czegoś więcej niż `disabled` na przycisku.
 *
 * Bez spinnera: szkielet w kształcie tego, co ma przyjść (trzy wiersze listy),
 * z delikatnym pulsowaniem. Zgodnie z 05-UI: ruch tylko na `opacity`,
 * a `prefers-reduced-motion` wyłącza pulsowanie przez klasę Tailwinda.
 */
export function AiWorking({
  label,
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      <p className="text-ink-soft flex items-center gap-2 text-sm">
        <Sparkles className="size-4 motion-safe:animate-pulse" aria-hidden />
        {label ?? pl.ai.working}
      </p>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="bg-surface-2 h-9 rounded-[var(--radius-control)] motion-safe:animate-pulse"
            style={{ animationDelay: `${index * 80}ms`, width: `${100 - index * 9}%` }}
          />
        ))}
      </div>
    </div>
  );
}
