import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageSection } from '@/components/shared';
import { ClientFormDialog } from '@/features/clients/ClientFormDialog';
import { useProjects } from '@/data/queries/useProjects';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Ile teczek mieści się na pulpicie, zanim zacznie zasłaniać resztę. */
const LIMIT = 6;

/**
 * „Aktywni klienci i projekty" — pierwszy blok pulpitu (K3, T-58).
 *
 * Pulpit prowadził dotąd do wycen; od T-53 osią aplikacji są klienci, więc
 * pierwsze, co widać po zalogowaniu, to teczki w toku. Pokazujemy **projekty**,
 * nie klientów: klient bez inwestycji to kontakt, a nie praca.
 *
 * Filtrujemy w bazie (`status`), a nie po pobraniu wszystkiego: zakończone
 * i anulowane teczki nie są tym, do czego się wraca rano.
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
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map((project) => (
              <li key={project.id}>
                <Link
                  to={routes.project(project.clientId, project.id)}
                  className="border-hair hover:bg-surface-2 flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] border px-3 py-2 transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-sm font-medium">
                      {project.name}
                    </span>
                    <span className="text-ink-soft block truncate text-xs">
                      {project.clientName}
                    </span>
                  </span>
                  <span className="text-ink-soft text-xs whitespace-nowrap">
                    {pl.projects.status[project.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageSection>

      <ClientFormDialog open={newClientOpen} onOpenChange={setNewClientOpen} client={null} />
    </>
  );
}
