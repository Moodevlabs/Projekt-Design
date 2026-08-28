import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FolderOpen, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectStagesTab } from './ProjectStagesTab';
import { SiteVisitTab } from '@/features/site-visit/SiteVisitTab';
import { ProjectAcceptanceCard } from '@/features/share/ProjectAcceptanceCard';
import { EmptyState, Money } from '@/components/shared';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectQuotesTab } from './ProjectQuotesTab';
import { ProjectNotesTab } from './ProjectNotesTab';
import { FilesTab } from '@/features/files/FilesTab';
import { ProjectRowMenu } from './ProjectRowMenu';
import { ProjectStatusSelect } from './ProjectStatusSelect';
import { kindLabel } from './kind-label';
import { useProjectOverview } from '@/data/queries/useProjects';
import { useClient } from '@/data/queries/useClients';
import { formatArea } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Karta projektu (05-UI §3).
 *
 * Zakładki: **Wyceny | Dokumenty | Pliki | Notatki** — komplet z 05-UI §3.
 * „Termin" jest zakładką wyceny, nie projektu: harmonogram
 * dotyczy konkretnej oferty i duplikowanie go tutaj znaczyłoby dwa źródła
 * tej samej daty.
 */
export function ProjectPage() {
  const { id: clientId, projectId } = useParams<{ id: string; projectId: string }>();
  const project = useProjectOverview(projectId);
  const client = useClient(clientId);
  const [editOpen, setEditOpen] = useState(false);

  if (project.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (project.isError || !project.data) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={pl.projects.notFoundTitle}
        description={pl.projects.notFoundDescription}
        action={
          <Button asChild variant="outline">
            <Link to={clientId ? routes.client(clientId) : routes.clients}>
              {pl.clients.backToList}
            </Link>
          </Button>
        }
      />
    );
  }

  const data = project.data;
  const meta = [
    data.kind ? kindLabel(data.kind) : '',
    data.areaM2 === null ? '' : `${formatArea(data.areaM2)} m²`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-5">
      {/* Ścieżka wraca do klienta, a nie do listy klientów — projekt żyje
          wewnątrz teczki inwestora i tak się po nim nawiguje. */}
      <Link
        to={routes.client(data.clientId)}
        className="text-ink-soft hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {data.clientName}
      </Link>

      <header className="card-surface flex flex-wrap items-start justify-between gap-5 p-6">
        <div className="min-w-0 space-y-2">
          <h1 className="text-ink truncate text-xl font-semibold">{data.name}</h1>
          <p className="text-ink-soft text-sm">
            <Link to={routes.client(data.clientId)} className="underline-offset-4 hover:underline">
              {data.clientName}
            </Link>
            {meta ? ` · ${meta}` : ''}
          </p>
          {data.address || data.city ? (
            <p className="text-ink-soft flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5" aria-hidden />
              {[data.address, data.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <Stat label={pl.projects.quotesCount} value={String(data.quotesCount)} />
          <Stat
            label={pl.projects.acceptedValue}
            value={
              data.acceptedNetCents > 0 ? (
                <Money cents={data.acceptedNetCents} />
              ) : (
                pl.projects.noValue
              )
            }
          />
          <Stat label={pl.projects.lastActivity} value={formatRelativeDay(data.lastActivityAt)} />

          <div className="flex items-center gap-2">
            <ProjectStatusSelect projectId={data.id} status={data.status} />
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              {pl.common.edit}
            </Button>
            <ProjectRowMenu project={data} onEdit={() => setEditOpen(true)} />
          </div>
        </div>
      </header>

      {/* Nad zakladkami, bo to jest NAJWAZNIEJSZA rzecz, jaka moze sie
          w projekcie wydarzyc — a nie szczegol jednej z list. */}
      <ProjectAcceptanceCard projectId={data.id} />

      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList aria-label={pl.projects.title}>
          <TabsTrigger value="quotes">{pl.projects.tabQuotes}</TabsTrigger>
          {/*
            Wizja lokalna zaraz po wycenach: to pierwsza rzecz, którą robi się
            NA MIEJSCU, i wraca się do niej przez cały projekt (poprawka 10).
          */}
          <TabsTrigger value="visit">{pl.siteVisit.tab}</TabsTrigger>
          <TabsTrigger value="stages">{pl.stages.tab}</TabsTrigger>
          <TabsTrigger value="files">{pl.files.tab}</TabsTrigger>
          <TabsTrigger value="notes">{pl.projects.tabNotes}</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <ProjectQuotesTab project={data} client={client.data ?? null} />
        </TabsContent>
        <TabsContent value="visit">
          <SiteVisitTab clientId={data.clientId} projectId={data.id} />
        </TabsContent>
        <TabsContent value="stages">
          <ProjectStagesTab projectId={data.id} stageProgress={data.stageProgress} />
        </TabsContent>
        <TabsContent value="files">
          <FilesTab clientId={data.clientId} projectId={data.id} />
        </TabsContent>
        <TabsContent value="notes">
          <ProjectNotesTab project={data} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        client={{ id: data.clientId, address: data.address, city: data.city }}
        project={data}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-24">
      <p className="label-caps text-ink-soft">{label}</p>
      <p className="text-ink mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
