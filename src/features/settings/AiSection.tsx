import { Sparkles } from 'lucide-react';

import { useAiQuota } from '@/data/queries/useAi';
import { aiErrorMessage } from '@/features/ai';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Ustawienia → Aplikacja → Asystent AI (T-135, FEATURES-AI.md §6).
 *
 * ## Po co ta sekcja, skoro nie ma w niej żadnego przełącznika
 *
 * Asystent nie ma „włącz/wyłącz" — jest częścią aplikacji jak eksport PDF.
 * Sekcja istnieje z dwóch powodów, które nie są ustawieniami:
 *
 *  1. **Limit.** Pula wywołań na miesiąc musi być widoczna ZANIM się skończy,
 *     a nie dopiero w komunikacie błędu przy próbie importu.
 *  2. **Jawność.** Jedyne miejsce, w którym mówimy wprost, co trafia do
 *     modelu, a co nigdy (reguła A7). Człowiek, który wysyła brief klienta
 *     „do AI", ma prawo to przeczytać bez szukania w regulaminie.
 */
export function AiSection({ canWrite }: { canWrite: boolean }) {
  const quota = useAiQuota();

  const ratio = quota.data && quota.data.limit > 0 ? quota.data.used / quota.data.limit : 0;
  const tone = ratio >= 1 ? 'text-danger' : ratio >= 0.9 ? 'text-warning' : 'text-ink';

  return (
    <section className="card-surface p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4" aria-hidden />
            {pl.ai.settings.title}
          </h2>
          <p className="text-ink-soft mt-1 max-w-prose text-sm">{pl.ai.settings.intro}</p>
        </div>
      </header>

      <dl className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-4">
          <div>
            <dt className="label-caps text-ink-faint">{pl.ai.settings.dataTitle}</dt>
            <dd className="text-ink-soft mt-1 max-w-prose text-sm">{pl.ai.settings.dataNote}</dd>
            <dd className="text-ink-faint mt-1 max-w-prose text-xs">
              {pl.ai.settings.providerNote}
            </dd>
          </div>
          <div>
            <dt className="label-caps text-ink-faint">{pl.ai.settings.rulesTitle}</dt>
            <dd className="mt-1">
              <ul className="text-ink-soft marker:text-ink-faint max-w-prose list-disc space-y-1 pl-4 text-sm">
                {pl.ai.settings.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </dd>
          </div>
        </div>

        <div className="bg-surface-2 min-w-[12rem] rounded-[var(--radius-card)] px-4 py-3">
          <dt className="label-caps text-ink-faint">{pl.ai.settings.usageTitle}</dt>
          <dd className="mt-2">
            {quota.data ? (
              <>
                <p className={cn('tabular font-display text-2xl leading-none', tone)}>
                  {quota.data.used}
                  <span className="text-ink-faint text-base"> / {quota.data.limit}</span>
                </p>
                <p className="text-ink-faint mt-2 text-xs">
                  {pl.ai.quotaResets(formatDate(quota.data.resetsAt))}
                </p>
              </>
            ) : quota.error ? (
              <p className="text-ink-soft text-xs">
                {canWrite ? aiErrorMessage(quota.error) : pl.ai.errors.read_only}
              </p>
            ) : (
              <p className="bg-hair h-7 w-16 animate-pulse rounded-[var(--radius-control)]" />
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
