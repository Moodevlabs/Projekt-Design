import { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { ProjectsTable } from './ProjectsTable';
import { ProjectFormDialog } from './ProjectFormDialog';
import { useProjects } from '@/data/queries/useProjects';
import type { Client } from '@/domain/client/schema';
import type { Project } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

/** Zakładka „Projekty" na karcie klienta — teczki jednego inwestora. */
export function ClientProjectsTab({ client }: { client: Client }) {
  const projects = useProjects({ clientId: client.id });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const rows = projects.data ?? [];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  if (projects.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.projects.loadError}{' '}
          <button
            type="button"
            onClick={() => void projects.refetch()}
            className="underline underline-offset-4"
          >
            {pl.common.retry}
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!projects.isLoading && rows.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={pl.clients.projectsEmptyTitle}
          description={pl.clients.projectsEmptyDescription}
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden />
              {pl.projects.first}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={openNew}>
              <Plus className="size-4" aria-hidden />
              {pl.projects.new}
            </Button>
          </div>
          <ProjectsTable
            rows={rows}
            loading={projects.isLoading}
            onEdit={(project) => {
              setEditing(project);
              setFormOpen(true);
            }}
          />
        </>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={client}
        project={editing}
      />
    </div>
  );
}
