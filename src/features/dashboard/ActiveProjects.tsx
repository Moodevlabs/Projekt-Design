import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { ProjectCover } from '@/features/projects/cover/ProjectCover';
import { useProjects } from '@/data/queries/useProjects';
import type { ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Ile teczek mieści się w prawej kolumnie, zanim zacznie zasłaniać resztę. */
const LIMIT = 6;

/**
 * „Projekty w toku" — prawa kolumna pulpitu (K3, T-58; układ z T-133).
 *
 * Pokazujemy **projekty**, nie klientów: klient bez inwestycji to kontakt,
 * a nie praca. Od T-131 każdy wiersz ma okładkę teczki (zdjęcie z plików
 * projektu albo rysunek wg typu) — tę samą, co karta projektu i lista
 * u klienta, więc teczkę poznaje się po obrazie, zanim przeczyta się nazwę.
 *
 * Lista pionowa, nie siatka kafli: kolumna ma 340 px i wiersz z okładką,
 * nazwą i statusem mieści się w niej w całości, a siatka łamałaby się na
 * jedną kolumnę i tak.
 */
export function ActiveProjects() {
  const projects = useProjects({ limit: LIMIT });
  const [newClientOpen, setNewClientOpen] = useState(false);

  // `lead`, `offer` i `in_progress` to praca w toku; `done`/`canceled` to
  // historia. Filtrujemy tutaj, bo repo przyjmuje jeden status, a te trzy
  // razem są jednym pojęciem: „aktywne".
  const rows = (projects.data ?? [])
    .filter((project) => project.status !== 'done' && project.status !== 'canceled')
    .slice(0, LIMIT);

  return (
    <>
      <section className="card-surface p-5" aria-label={pl.dashboard.activeProjects}>
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-ink text-[17px]">{pl.dashboard.activeProjects}</h2>
          <Button variant="outline" size="sm" onClick={() => setNewClientOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {pl.clients.new}
          </Button>
        </header>

        {projects.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-[var(--radius-control)]" />
            <Skeleton className="h-14 rounded-[var(--radius-control)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-3">
            <p className="text-ink-soft text-sm">{pl.dashboard.activeProjectsEmpty}</p>
            <Button variant="outline" size="sm" asChild>
              <Link to={routes.clients}>
                <Users className="size-4" aria-hidden />
                {pl.nav.clients}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-hair -mx-2 divide-y">
            {rows.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>

      <ClientFormDialog open={newClientOpen} onOpenChange={setNewClientOpen} client={null} />
    </>
  );
}

function ProjectRow({ project }: { project: ProjectOverview }) {
  return (
    <li>
      <Link
        to={routes.project(project.clientId, project.id)}
        data-testid="project-tile"
        className="hover:bg-surface-2/70 focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] px-2 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ProjectCover
          path={project.coverPath}
          kind={project.kind}
          alt=""
          className="h-10 w-14 shrink-0"
        />

        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-sm font-medium">{project.name}</span>
          <span className="text-ink-soft block truncate text-xs">{project.clientName}</span>
        </span>

        <span className="bg-beige text-ink shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
          {pl.projects.status[project.status]}
        </span>
      </Link>
    </li>
  );
}
