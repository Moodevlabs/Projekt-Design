import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { initialsOf, PageSection } from '@/components/shared';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { useClientAvatarUrl } from '@/data/queries/useClientAvatar';
import { useProjects } from '@/data/queries/useProjects';
import type { ProjectOverview } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Ile teczek mieści się na pulpicie, zanim zacznie zasłaniać resztę. */
const LIMIT = 6;

/**
 * „Aktywni klienci i projekty" — teczki w toku (K3, T-58).
 *
 * Pokazujemy **projekty**, nie klientów: klient bez inwestycji to kontakt,
 * a nie praca.
 *
 * Od 2026-08-27 (poprawka 6) mają postać kart w tym samym języku, co lista
 * klientów: zdjęcie osoby, nazwa teczki, stan. Dwa różne kształty dla tej
 * samej rzeczy — „czyja to robota i na czym stoi" — kazałyby uczyć się
 * aplikacji dwa razy.
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
      <PageSection
        title={pl.dashboard.activeProjects}
        action={
          <Button variant="outline" size="sm" onClick={() => setNewClientOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {pl.clients.new}
          </Button>
        }
        className="mb-6"
      >
        {projects.isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            <Skeleton className="h-[72px] rounded-[var(--radius-card)]" />
            <Skeleton className="h-[72px] rounded-[var(--radius-card)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-soft text-sm">{pl.dashboard.activeProjectsEmpty}</p>
            <Button variant="outline" size="sm" asChild>
              <Link to={routes.clients}>
                <Users className="size-4" aria-hidden />
                {pl.nav.clients}
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {rows.map((project) => (
              <ProjectTile key={project.id} project={project} />
            ))}
          </ul>
        )}
      </PageSection>

      <ClientFormDialog open={newClientOpen} onOpenChange={setNewClientOpen} client={null} />
    </>
  );
}

function ProjectTile({ project }: { project: ProjectOverview }) {
  const avatar = useClientAvatarUrl(project.clientAvatarPath);

  return (
    <li>
      <Link
        to={routes.project(project.clientId, project.id)}
        data-testid="project-tile"
        className="border-hair hover:border-ink/20 hover:bg-surface-2/60 flex min-w-0 items-center gap-3 rounded-[var(--radius-card)] border p-3 transition-colors"
      >
        <Avatar className="size-9 shrink-0">
          {avatar.data ? <AvatarImage src={avatar.data} alt={project.clientName} /> : null}
          <AvatarFallback className="bg-surface-2 text-ink-soft text-[11px] font-medium">
            {initialsOf(project.clientName, '??')}
          </AvatarFallback>
        </Avatar>

        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-sm font-medium">{project.name}</span>
          <span className="text-ink-soft block truncate text-xs">{project.clientName}</span>
        </span>

        <span className="text-ink-soft shrink-0 text-xs whitespace-nowrap">
          {pl.projects.status[project.status]}
        </span>
      </Link>
    </li>
  );
}
