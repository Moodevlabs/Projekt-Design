import { Skeleton } from '@/components/ui/skeleton';
import { useLibraryUsage } from '@/data/queries/useLibrary';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * „Statystyki użycia" — ile wycen korzysta z tej usługi (T-61).
 *
 * Liczone przez RPC z `quotes.body`, nie z licznika w tabeli: to liczba
 * orientacyjna („czy w ogóle tego używam?"), a nie dana, na której cokolwiek
 * się opiera. Cache 5 minut — świeżość co do sekundy nie jest tu nic warta.
 *
 * Usługa nieużywana **nie dostaje zera w liczniku, tylko zdanie**: „0" wygląda
 * jak błąd ładowania, a „Jeszcze nieużywana" mówi to samo bez wątpliwości.
 */
export function ItemUsageCard({ itemId }: { itemId: string }) {
  const usage = useLibraryUsage();

  const stats = (usage.data ?? []).find((row) => row.itemId === itemId);

  return (
    <section className="card-surface space-y-2 p-4">
      <h2 className="text-ink text-sm font-semibold">{pl.library.usageTitle}</h2>

      {usage.isLoading ? (
        <Skeleton className="h-4 w-32" />
      ) : !stats || stats.quotesCount === 0 ? (
        <p className="text-ink-soft text-xs">{pl.library.usageNever}</p>
      ) : (
        <>
          <p className="text-ink text-sm">{pl.library.usageCount(stats.quotesCount)}</p>
          {stats.lastUsedAt ? (
            <p className="text-ink-soft text-xs">
              {pl.library.usageLast(formatRelativeDay(stats.lastUsedAt))}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
