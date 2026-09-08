import { Money } from '@/components/shared';
import { useQuote, useQuotesList } from '@/data/queries/useQuotes';
import { projectStages, stageSummary } from '@/domain/project/stages';
import type { ProjectOverview } from '@/domain/project/schema';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * „W skrócie" (T-132): cztery liczby, które wcześniej stały w nagłówku.
 *
 * Etapy liczone tak samo jak w zakładce „Etapy": z harmonogramu
 * zaakceptowanej wyceny i postępu w projekcie. Bez przyjętej oferty
 * pokazujemy kreskę, nie „0 z 0" — zero etapów to nie jest informacja.
 */
export function ProjectSummaryCard({ project }: { project: ProjectOverview }) {
  const accepted = useQuotesList({ projectId: project.id, status: 'accepted' });
  const acceptedQuote = accepted.data?.[0];
  const quote = useQuote(acceptedQuote?.id ?? '');
  const stages = projectStages(quote.data?.schedule ?? null, project.stageProgress);
  const summary = stageSummary(stages);

  return (
    <section className="card-surface" aria-label={pl.projects.summary}>
      <h2 className="px-[18px] pt-4 pb-1 text-[13px] font-semibold">{pl.projects.summary}</h2>
      <dl className="grid grid-cols-2 px-[18px] pb-4">
        <Stat label={pl.projects.quotesCount} value={String(project.quotesCount)} first />
        <Stat
          label={pl.projects.acceptedValue}
          value={
            project.acceptedNetCents > 0 ? (
              <Money cents={project.acceptedNetCents} />
            ) : (
              pl.projects.noValue
            )
          }
          first
        />
        <Stat
          label={pl.stages.tab}
          value={
            summary.total > 0 ? pl.stages.doneOf(summary.done, summary.total) : pl.projects.noValue
          }
        />
        <Stat label={pl.projects.lastActivity} value={formatRelativeDay(project.lastActivityAt)} />
      </dl>
    </section>
  );
}

function Stat({
  label,
  value,
  first = false,
}: {
  label: string;
  value: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div className={first ? 'py-2.5' : 'border-hair border-t py-2.5'}>
      <dt className="label-caps text-ink-soft">{label}</dt>
      <dd className="text-ink mt-0.5 text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}
