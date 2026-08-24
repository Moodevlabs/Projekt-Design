import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateClient } from '@/data/queries/useClients';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

/**
 * Notatki o kliencie — zapis JAWNY, nie autozapis.
 *
 * Edytor wyceny zapisuje sam, bo tam człowiek pracuje ciągle i dokument jest
 * jego jedyną robotą. Notatka o kliencie to notatka na marginesie: zapisanie
 * jej w trakcie pisania zdania zostawiłoby w kartotece urwane pół myśli.
 */
export function ClientNotesTab({ client }: { client: Client }) {
  const [value, setValue] = useState(client.notes);
  const update = useUpdateClient();

  // Zmiana klienta (albo zapis z innego miejsca) ma przestawić pole; to, co
  // ktoś właśnie pisze, zostaje — dopóki nie zmienił się rekord.
  useEffect(() => setValue(client.notes), [client.id, client.notes]);

  const dirty = value !== client.notes;

  return (
    <div className="card-surface space-y-3 p-5">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={10}
        aria-label={pl.clients.notes}
        placeholder={pl.clients.notesPlaceholder}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-ink-soft text-xs">{pl.clients.notesHint}</p>
        <Button
          disabled={!dirty || update.isPending}
          onClick={() => {
            update.mutate(
              { id: client.id, patch: { notes: value } },
              {
                onSuccess: () => toast.success(pl.clients.notesSaved),
                onError: (error) => toast.error(error.message),
              },
            );
          }}
        >
          {pl.common.save}
        </Button>
      </div>
    </div>
  );
}
