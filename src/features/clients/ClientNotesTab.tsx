import { toast } from 'sonner';
import { NotesPanel } from '@/components/shared';
import { useUpdateClient } from '@/data/queries/useClients';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

/** Notatki o kliencie — zapis jawny, wspólny komponent z notatkami projektu. */
export function ClientNotesTab({ client }: { client: Client }) {
  const update = useUpdateClient();

  return (
    <NotesPanel
      value={client.notes}
      recordId={client.id}
      label={pl.clients.notes}
      placeholder={pl.clients.notesPlaceholder}
      hint={pl.clients.notesHint}
      saving={update.isPending}
      onSave={(notes) =>
        update.mutate(
          { id: client.id, patch: { notes } },
          {
            onSuccess: () => toast.success(pl.clients.notesSaved),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    />
  );
}
