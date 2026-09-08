import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHead } from './SectionHead';
import { ProjectCover } from '@/features/projects/cover/ProjectCover';
import { useProjects } from '@/data/queries/useProjects';
import type { ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Cztery okładki w dwóch rzędach — tyle mieści prawa kolumna bez przewijania. */
const LIMIT = 4;

/**
 * „Projekty w toku" — prawa kolumna pulpitu (K3, T-58; układ z T-133).
 *
 * Pokazujemy **projekty**, nie klientów: klient bez inwestycji to kontakt,
 * a nie praca. Siatka okładek, obraz pierwszy: teczkę poznaje się po
 * zdjęciu z jej plików (albo rysunku wg typu, T-131), zanim przeczyta się
 * nazwę. Pod okładką nazwa, klient i status zwykłym tekstem — bez pigułek,
 * bez ikon; przyjęta oferta odróżnia się kolorem statusu.
 */
export function ActiveProjects() {
  const projects = useProjects({ limit: LIMIT * 2 });

  // `lead`, `offer` i `in_progress` to praca w toku; `done`/`canceled` to
  // historia. Filtrujemy tutaj, bo repo przyjmuje jeden status, a te trzy
  // razem są jednym pojęciem: „aktywne".
  const rows = (projects.data ?? [])
    .filter((project) => project.status !== 'done' && project.status !== 'canceled')
    .slice(0, LIMIT);

  return (
    <section aria-label={pl.dashboard.activeProjects}>
      <SectionHead
        title={pl.dashboard.activeProjects}
        action={
          <Link
            to={routes.clients}
            className="text-ink-soft hover:text-ink text-[12.5px] font-medium"
          >
            {pl.dashboard.activeProjectsAll}
          </Link>
        }
      />

      {projects.isLoading ? (
        <div className="mt-3.5 grid grid-cols-2 gap-x-3.5 gap-y-4">
          <Skeleton className="aspect-[16/10] rounded-[6px]" />
          <Skeleton className="aspect-[16/10] rounded-[6px]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-ink-soft mt-3.5 text-sm">{pl.dashboard.activeProjectsEmpty}</p>
      ) : (
        <ul className="mt-3.5 grid grid-cols-2 gap-x-3.5 gap-y-4">
          {rows.map((project) => (
            <ProjectTile key={project.id} project={project} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProjectTile({ project }: { project: ProjectOverview }) {
  const accepted = project.acceptedNetCents > 0;

  return (
    <li className="min-w-0">
      <Link
        to={routes.project(project.clientId, project.id)}
        data-testid="project-tile"
        className="focus-visible:ring-ring group block rounded-[6px] focus-visible:ring-2 focus-visible:outline-none"
      >
        <ProjectCover
          path={project.coverPath}
          kind={project.kind}
          alt=""
          className="aspect-[16/10] w-full rounded-[6px] transition-opacity group-hover:opacity-90"
        />
        <span className="text-ink mt-2 block truncate text-[13.5px] font-medium">
          {project.name}
        </span>
        <span className="text-ink-soft flex justify-between gap-2 text-[12.5px]">
          <span className="truncate">{project.clientName}</span>
          <span className={cn('shrink-0', accepted ? 'text-[var(--status-accepted)]' : 'text-ink')}>
            {accepted ? pl.dashboard.projectAccepted : pl.projects.status[project.status]}
          </span>
        </span>
      </Link>
    </li>
  );
}
