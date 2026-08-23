import { formatDate } from '@/lib/dates';
import type { ScheduleResult } from '@/domain/schedule';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wynik harmonogramu: dni obu stron, dwa terminy i pasek etapów.
 *
 * Pokazujemy **widełki, nie jedną datę**. Termin optymalny zakłada, że inwestor
 * odpowiada natychmiast; najpóźniejszy dolicza jego dni. Rzeczywistość leży
 * pomiędzy, a podanie jednej liczby byłoby obietnicą, której nikt nie
 * kontroluje w całości.
 */
export function ScheduleResultCard({ result }: { result: ScheduleResult }) {
  const razem = result.providerDays + result.clientDays;

  return (
    <aside className="card-surface space-y-3.5 px-6 py-5">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--ink-soft)] uppercase">
        {pl.editor.scheduleResult}
      </p>

      <div className="space-y-2">
        <Line label={pl.editor.scheduleProviderDays} value={pl.editor.stageDays(result.providerDays)} />
        <Line label={pl.editor.scheduleClientDays} value={pl.editor.stageDays(result.clientDays)} />
      </div>

      {razem > 0 ? <StageBar result={result} /> : null}

      <div className="border-t border-[var(--hair)] pt-3.5">
        {result.endOptimal ? (
          <>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--ink-soft)] uppercase">
              {pl.editor.scheduleEndOptimal}
            </p>
            <p className="amount mt-1 text-[20px] leading-none font-bold">
              {formatDate(new Date(result.endOptimal))}
            </p>
            {result.endLatest ? (
              <p className="text-ink-soft mt-2 text-xs">
                {pl.editor.scheduleEndLatest}:{' '}
                <span className="tabular">{formatDate(new Date(result.endLatest))}</span>
              </p>
            ) : null}
          </>
        ) : (
          // Bez daty startu nie zgadujemy terminow — ale dni i tak sa policzone.
          <p className="text-ink-soft text-xs">{pl.editor.scheduleNoStart}</p>
        )}
      </div>

      <p className="text-ink-soft text-[11px]">
        {pl.editor.scheduleCalendarHint(result.calendarDaysOptimal, result.calendarDaysLatest)}
      </p>
    </aside>
  );
}

/**
 * Prosty „Gantt" na czystym CSS — proporcje etapów, bez osi czasu.
 *
 * Świadomie **nie jest wykresem**: kolejność etapów w harmonogramie nie
 * oznacza ich rozłożenia w kalendarzu (nie modelujemy zależności), więc oś
 * czasu obiecywałaby precyzję, której tu nie ma. Pasek pokazuje to, co
 * naprawdę wiemy — ile który etap waży.
 */
function StageBar({ result }: { result: ScheduleResult }) {
  const razem = result.perStage.reduce((sum, stage) => sum + stage.days, 0);
  if (razem <= 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="border-hair flex h-2.5 overflow-hidden rounded-[var(--radius-pill)] border">
        {result.perStage
          .filter((stage) => stage.days > 0)
          .map((stage) => (
            <span
              key={stage.stageId}
              title={`${stage.name}: ${pl.editor.stageDays(stage.days)}`}
              style={{ width: `${(stage.days / razem) * 100}%` }}
              className={cn(
                stage.owner === 'provider'
                  ? 'bg-[var(--doc-sage)]'
                  : 'bg-[var(--doc-ink-soft)] opacity-45',
              )}
            />
          ))}
      </div>

      <div className="text-ink-soft flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-[var(--doc-sage)]" aria-hidden />
          {pl.editor.stageOwnerProviderFull}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-[var(--doc-ink-soft)] opacity-45" aria-hidden />
          {pl.editor.stageOwnerClientFull}
        </span>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-soft text-xs">{label}</span>
      <span className="tabular text-ink text-xs">{value}</span>
    </div>
  );
}
