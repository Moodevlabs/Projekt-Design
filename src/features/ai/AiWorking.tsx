import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Stan „asystent pracuje" — wywołanie modelu trwa od kilku sekund do minuty,
 * więc potrzebuje czegoś więcej niż `disabled` na przycisku.
 *
 * Bez spinnera: szkielet w kształcie tego, co ma przyjść (trzy wiersze listy),
 * z delikatnym pulsowaniem. Zgodnie z 05-UI: ruch tylko na `opacity`,
 * a `prefers-reduced-motion` wyłącza pulsowanie przez klasę Tailwinda.
 *
 * `hint` i licznik sekund doszły 2026-10-22: przy dłuższych wywołaniach
 * (brief z całą biblioteką) człowiek bez żadnego ruchu na ekranie uznawał,
 * że coś się zawiesiło, i zamykał arkusz — a wynik nie jest zapisywany w tle.
 * Licznik mówi „to nadal trwa", podpowiedź mówi „ile zwykle" i „nie zamykaj".
 */
export function AiWorking({
  label,
  hint,
  showElapsed = false,
  rows = 3,
  className,
}: {
  label?: string;
  hint?: string;
  showElapsed?: boolean;
  rows?: number;
  className?: string;
}) {
  const seconds = useElapsedSeconds(showElapsed);

  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-live="polite">
      <p className="text-ink-soft flex items-center gap-2 text-sm">
        <Sparkles className="size-4 motion-safe:animate-pulse" aria-hidden />
        <span className="min-w-0 flex-1">{label ?? pl.ai.working}</span>
        {showElapsed ? (
          <span className="tabular text-ink-faint text-xs">{pl.ai.elapsed(seconds)}</span>
        ) : null}
      </p>
      {hint ? <p className="text-ink-faint text-xs">{hint}</p> : null}
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

/** Sekundy od zamontowania — tylko gdy ktoś chce je pokazać. */
function useElapsedSeconds(enabled: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [enabled]);
  return seconds;
}
