import { CircleCheck, CircleDashed, CircleDot, User } from 'lucide-react';
import { toast } from 'sonner';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { useSetProjectStageProgress } from '@/data/queries/useProjects';
import { useQuote, useQuotesList } from '@/data/queries/useQuotes';
import {
  nextStage,
  projectStages,
  stageSummary,
  withStageStatus,
  type ProjectStage,
  type StageProgress,
  type StageStatus,
} from '@/domain/project/stages';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  stageProgress: StageProgress;
}

/**
 * Zakładka „Etapy" w projekcie (T-68).
 *
 * Etapy **pochodzą z harmonogramu zaakceptowanej wyceny**, nie z projektu.
 * Projekt trzyma sam postęp. Dlatego zakładka bywa pusta i to jest poprawny
 * stan: dopóki nie ma przyjętej oferty z harmonogramem, nie ma czego
 * realizować.
 *
 * To NIE jest Gantt ani lista zadań (koncepcja §17). Trzy stany i data.
 */
export function ProjectStagesTab({ projectId, stageProgress }: Props) {
  const quotes = useQuotesList({ projectId, status: 'accepted' });
  const accepted = quotes.data?.[0];
  const quote = useQuote(accepted?.id ?? '');
  const save = useSetProjectStageProgress(projectId);

  if (quotes.isLoading || (accepted && quote.isLoading)) {
    return <Skeleton className="h-40 rounded-[var(--radius-card)]" />;
  }

  const stages = projectStages(quote.data?.schedule ?? null, stageProgress);

  if (stages.length === 0) {
    return (
      <EmptyState
        title={pl.stages.emptyTitle}
        description={accepted ? pl.stages.emptyNoSchedule : pl.stages.emptyNoAccepted}
      />
    );
  }

  const summary = stageSummary(stages);
  const next = nextStage(stages);

  const setStatus = (stage: ProjectStage, status: StageStatus) => {
    save.mutate(withStageStatus(stageProgress, { id: stage.id, name: stage.name }, status), {
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="border-hair-strong rounded-[var(--radius-card)] border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">{pl.stages.progress}</span>
          <span className="text-sm tabular-nums">
            {pl.stages.doneOf(summary.done, summary.total)}
          </span>
        </div>
        <Progress value={summary.percent} className="mt-2" />
        {next ? <p className="text-ink-soft mt-2 text-xs">{pl.stages.next(next.name)}</p> : null}
      </div>

      <ul className="border-hair-strong divide-hair divide-y rounded-[var(--radius-card)] border">
        {stages.map((stage) => (
          <StageRow key={stage.id} stage={stage} onStatus={setStatus} busy={save.isPending} />
        ))}
      </ul>
    </div>
  );
}

const ICONS: Record<StageStatus, typeof CircleDashed> = {
  pending: CircleDashed,
  in_progress: CircleDot,
  done: CircleCheck,
};

function StageRow({
  stage,
  onStatus,
  busy,
}: {
  stage: ProjectStage;
  onStatus: (stage: ProjectStage, status: StageStatus) => void;
  busy: boolean;
}) {
  const Icon = ICONS[stage.status];

  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', stage.orphaned && 'opacity-60')}>
      <Icon
        className={cn(
          'size-4 shrink-0',
          stage.status === 'done' ? 'text-positive' : 'text-ink-faint',
        )}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {stage.name}
          {stage.clientSide ? (
            <span title={pl.stages.clientSide}>
              <User className="text-ink-faint size-3" aria-label={pl.stages.clientSide} />
            </span>
          ) : null}
        </p>
        <p className="text-ink-faint text-xs">
          {stage.orphaned ? `${pl.stages.orphaned} · ` : ''}
          {describeDates(stage)}
        </p>
      </div>

      {/* Etap spoza harmonogramu jest historią, nie planem — nie da się go
          już przestawiać, bo nie wiadomo, do czego miałby wrócić. */}
      {stage.orphaned ? null : (
        <div className="flex gap-1">
          {(['pending', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              aria-pressed={stage.status === status}
              onClick={() => onStatus(stage, status)}
              className={cn(
                'rounded-[var(--radius-pill)] px-2.5 py-1 text-xs transition-colors',
                stage.status === status
                  ? 'bg-primary text-primary-foreground'
                  : 'text-ink-soft hover:bg-surface-2',
              )}
            >
              {pl.stages.status[status]}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function describeDates(stage: ProjectStage): string {
  if (stage.completedAt) return pl.stages.completedAt(formatDate(stage.completedAt));
  if (stage.startedAt) return pl.stages.startedAt(formatDate(stage.startedAt));
  return pl.stages.notStarted;
}
