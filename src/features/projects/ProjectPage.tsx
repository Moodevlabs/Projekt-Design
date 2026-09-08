import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectStagesTab } from './ProjectStagesTab';
import { SiteVisitTab } from '@/features/site-visit/SiteVisitTab';
import { ProjectAcceptanceCard } from '@/features/share/ProjectAcceptanceCard';
import { EmptyState } from '@/components/shared';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectQuotesTab } from './ProjectQuotesTab';
import { ProjectNotesTab } from './ProjectNotesTab';
import { ProjectOverviewTab } from './overview/ProjectOverviewTab';
import { FilesTab } from '@/features/files/FilesTab';
import { ProjectRowMenu } from './ProjectRowMenu';
import { ProjectStatusSelect } from './ProjectStatusSelect';
import { CopyRoomsDialog } from './CopyRoomsDialog';
import { useNewQuoteForProject } from './useNewQuoteForProject';
import { kindLabel } from './kind-label';
import { useProjectOverview } from '@/data/queries/useProjects';
import { useClient } from '@/data/queries/useClients';
import { formatArea } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

type ProjectTab = 'overview' | 'quotes' | 'visit' | 'stages' | 'files' | 'notes';

/**
 * Karta projektu (05-UI §3, przeprojektowana w T-132 wg inspiracji).
 *
 * Nagłówek bez ramki karty: tytuł w kroju display, obok status, pod nim typ,
 * metraż i adres; akcje po prawej. Liczby, które tu stały, przeszły do karty
 * „W skrócie" na zakładce „Przegląd" — nagłówek ma nazywać projekt, nie go
 * podsumowywać.
 *
 * Zakładki: **Przegląd | Dokumenty | Wizja lokalna | Etapy | Pliki | Notatki**.
 * „Termin" jest zakładką wyceny, nie projektu: harmonogram dotyczy konkretnej
 * oferty i duplikowanie go tutaj znaczyłoby dwa źródła tej samej daty.
 * Zakładki są sterowane, bo „Wszystkie ›" w „Ostatnich plikach" przełącza na
 * „Pliki".
 */
export function ProjectPage() {
  const { id: clientId, projectId } = useParams<{ id: string; projectId: string }>();
  const project = useProjectOverview(projectId);
  const client = useClient(clientId);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<ProjectTab>('overview');
  const nowa = useNewQuoteForProject(project.data ?? null, client.data ?? null);

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
  const address = [data.address, data.city].filter(Boolean).join(', ');

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

      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {/* Krój display BEZ klasy wagi — Faculty Glyphic ma jedną (05-UI §1). */}
            <h1 className="font-display text-ink truncate text-[28px] leading-tight">
              {data.name}
            </h1>
            <ProjectStatusSelect
              projectId={data.id}
              status={data.status}
              className="bg-beige h-7 w-auto rounded-[var(--radius-pill)] border-transparent px-3 text-[12.5px] font-medium"
            />
          </div>
          <p className="text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px]">
            <Link to={routes.client(data.clientId)} className="underline-offset-4 hover:underline">
              {data.clientName}
            </Link>
            {meta ? <span>{meta}</span> : null}
            {address ? <span>{address}</span> : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!nowa.ready || nowa.working} onClick={() => void nowa.newQuote()}>
            <Plus className="size-4" aria-hidden />
            {pl.projects.newQuote}
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            {pl.common.edit}
          </Button>
          <ProjectRowMenu project={data} onEdit={() => setEditOpen(true)} />
        </div>
      </header>

      {/* Nad zakladkami, bo to jest NAJWAZNIEJSZA rzecz, jaka moze sie
          w projekcie wydarzyc — a nie szczegol jednej z list. */}
      <ProjectAcceptanceCard projectId={data.id} />

      <Tabs value={tab} onValueChange={(next) => setTab(next as ProjectTab)} className="space-y-4">
        <TabsList aria-label={pl.projects.title}>
          <TabsTrigger value="overview">{pl.projects.tabOverview}</TabsTrigger>
          <TabsTrigger value="quotes">{pl.projects.tabQuotes}</TabsTrigger>
          {/*
            Wizja lokalna zaraz po dokumentach: to pierwsza rzecz, którą robi
            się NA MIEJSCU, i wraca się do niej przez cały projekt (poprawka 10).
          */}
          <TabsTrigger value="visit">{pl.siteVisit.tab}</TabsTrigger>
          <TabsTrigger value="stages">{pl.stages.tab}</TabsTrigger>
          <TabsTrigger value="files">{pl.files.tab}</TabsTrigger>
          <TabsTrigger value="notes">{pl.projects.tabNotes}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab project={data} onShowFiles={() => setTab('files')} />
        </TabsContent>
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

      {/* „Nowa dokumentacja" z nagłówka pyta o pomieszczenia tak samo, jak
          przycisk na zakładce „Dokumenty" — jeden hook, dwa wejścia. */}
      <CopyRoomsDialog
        open={nowa.pendingRooms !== null}
        fromTitle={nowa.pendingRooms?.quoteTitle ?? ''}
        roomsCount={nowa.pendingRooms?.rooms.length ?? 0}
        onCopy={nowa.confirmCopy}
        onSkip={nowa.skipCopy}
        onCancel={nowa.cancelCopy}
      />
    </div>
  );
}
