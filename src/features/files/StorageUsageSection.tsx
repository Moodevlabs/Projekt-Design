import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSection } from '@/components/shared';
import { useStorageUsage } from '@/data/queries/useFiles';
import { QUOTA_WARN_RATIO, formatBytes } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Pasek zużycia miejsca w Ustawieniach → Pliki.
 *
 * Ostrzegamy **od 90%** (koncepcja §3 reguła 4), a nie dopiero przy odbiciu:
 * limit, o którym człowiek dowiaduje się w chwili, gdy nie może wrzucić
 * umowy, jest limitem źle pokazanym.
 */
export function StorageUsageSection() {
  const usage = useStorageUsage();

  if (usage.isLoading || !usage.data) {
    return (
      <PageSection title={pl.files.usageTitle}>
        <Skeleton className="h-6 w-full" />
      </PageSection>
    );
  }

  const { usedBytes, quotaBytes } = usage.data;
  const ratio = quotaBytes > 0 ? usedBytes / quotaBytes : 0;
  const full = ratio >= 1;
  const warning = ratio >= QUOTA_WARN_RATIO;

  return (
    <PageSection title={pl.files.usageTitle}>
      <div className="space-y-2">
        <p className="text-ink-soft mb-3 text-sm">{pl.files.usageDescription}</p>
        <Progress value={Math.min(100, Math.round(ratio * 100))} />
        <p className="text-ink-soft text-sm tabular-nums">
          {pl.files.usage(formatBytes(usedBytes), formatBytes(quotaBytes))}
        </p>
        {warning ? (
          <p className={cn('text-sm', full ? 'text-danger' : 'text-warning')}>
            {full ? pl.files.usageFull : pl.files.usageWarning}
          </p>
        ) : null}
      </div>
    </PageSection>
  );
}
