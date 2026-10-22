import { useAiQuota } from '@/data/queries/useAi';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Licznik „12 z 300 wywołań w tym miesiącu" — cicha linijka pod przyciskiem
 * akcji AI, żeby limit nie był niespodzianką dopiero przy błędzie.
 *
 * Milczy, dopóki nie ma danych: pusty wiersz jest lepszy niż „ładuję…" przy
 * czymś, na co nikt nie czeka.
 */
export function AiUsageHint({ className }: { className?: string }) {
  const quota = useAiQuota();
  if (!quota.data) return null;

  const { used, limit } = quota.data;
  const nearLimit = limit > 0 && used / limit >= 0.9;

  return (
    <p className={cn('tabular text-xs', nearLimit ? 'text-warning' : 'text-ink-faint', className)}>
      {pl.ai.quota(used, limit)}
    </p>
  );
}
