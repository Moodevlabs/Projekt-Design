import { toast } from 'sonner';
import { NotesPanel } from '@/components/shared';
import { useUpdateProject } from '@/data/queries/useProjects';
import type { Project } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

/** Notatki o projekcie — zapis jawny, wspólny komponent z notatkami klienta. */
export function ProjectNotesTab({ project }: { project: Project }) {
  const update = useUpdateProject();

  return (
    <NotesPanel
      value={project.notes}
      recordId={project.id}
      label={pl.projects.notes}
      placeholder={pl.projects.notesPlaceholder}
      hint={pl.projects.notesHint}
      saving={update.isPending}
      onSave={(notes) =>
        update.mutate(
          { id: project.id, patch: { notes } },
          {
            onSuccess: () => toast.success(pl.projects.notesSaved),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    />
  );
}
