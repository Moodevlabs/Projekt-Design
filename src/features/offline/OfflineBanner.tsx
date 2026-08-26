import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { useOfflineQueue } from './useOfflineQueue';

/**
 * Pasek stanu pracy bez sieci (T-29).
 *
 * **Milczy, gdy nie ma o czym mówić.** Pasek widoczny zawsze zamienia się
 * w element dekoracyjny i przestaje być zauważany dokładnie wtedy, gdy zaczyna
 * mieć znaczenie.
 *
 * Trzy stany, w kolejności ważności:
 *  1. **Coś się zablokowało** (konflikt / wyczerpane próby) — czerwony, bo
 *     wymaga decyzji człowieka i nie rozwiąże się samo.
 *  2. **Brak sieci** — spokojny komunikat z liczbą oczekujących zmian.
 *     Ma uspokajać („nic nie przepadło"), a nie straszyć.
 *  3. **Jest sieć, ale coś jeszcze czeka** — przejściowe, z możliwością
 *     ponowienia ręcznie.
 */
export function OfflineBanner() {
  const { online, pendingCount, blockedCount, flushing, flushNow } = useOfflineQueue();

  const blocked = blockedCount > 0;
  const waiting = pendingCount > 0;

  if (online && !waiting && !blocked) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 px-7 py-2 text-sm',
        blocked ? 'bg-danger-wash text-danger' : 'bg-surface-2 text-ink-soft',
      )}
    >
      {blocked ? (
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
      ) : (
        <CloudOff className="size-4 shrink-0" aria-hidden />
      )}

      <span className="min-w-0 flex-1">
        {blocked
          ? pl.offline.blocked(blockedCount)
          : online
            ? pl.offline.waitingOnline(pendingCount)
            : waiting
              ? pl.offline.waitingOffline(pendingCount)
              : pl.offline.offline}
      </span>

      {online && (waiting || blocked) ? (
        <Button size="sm" variant="ghost" onClick={flushNow} disabled={flushing}>
          <RefreshCw className={cn('size-3.5', flushing && 'animate-spin')} aria-hidden />
          {pl.offline.retry}
        </Button>
      ) : null}
    </div>
  );
}
