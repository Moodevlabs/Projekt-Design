import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateQuote, useQuotesList } from '@/data/queries/useQuotes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { getQuote } from '@/data/repos/quotes.repo';
import { newRoom, quoteBodyFromSettings, type Room } from '@/domain/quote';
import { clientSnapshot, type Client } from '@/domain/client/schema';
import type { Project } from '@/domain/project/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Ostatnia wycena w projekcie razem z jej pomieszczeniami — podstawa pytania. */
interface RoomsOffer {
  quoteTitle: string;
  rooms: Room[];
}

/**
 * „Nowa wycena" w projekcie.
 *
 * Dokument dostaje `project_id`, `client_id` i snapshot klienta. Jeśli
 * w teczce jest już wycena z pomieszczeniami, **pytamy**, czy je przepisać
 * (koncepcja §2 reguła 4) — nie robimy tego automatem, bo druga wycena bywa
 * ofertą na zupełnie inny zakres.
 *
 * Pomieszczenia są **kopiowane, nie współdzielone** (§9.2): projekt nie ma
 * własnej listy, bo cennik liczy je z `body.rooms` konkretnej wyceny. Nowe
 * `id` dla każdego pomieszczenia to nie ozdoba — te same identyfikatory
 * w dwóch dokumentach kolidowałyby z regułami cenowymi per pomieszczenie.
 */
export function useNewQuoteForProject(project: Project | null, client: Client | null) {
  const navigate = useNavigate();
  const create = useCreateQuote();
  const workspace = useWorkspace();
  const settings = workspace.data?.settings;

  const [pendingRooms, setPendingRooms] = useState<RoomsOffer | null>(null);
  const [working, setWorking] = useState(false);

  const createWith = useCallback(
    async (rooms: Room[]) => {
      if (!settings || !project || !client) return;
      setWorking(true);

      try {
        const body = quoteBodyFromSettings(settings);
        body.client = clientSnapshot(client);
        // Adres inwestycji jest przy projekcie, a miasto w dokumencie —
        // teczka wygrywa z kartoteką, bo wycena dotyczy TEJ inwestycji.
        if (project.city) body.client.city = project.city;
        body.rooms = rooms.map((room) => newRoom({ ...room, id: undefined }));

        const quote = await create.mutateAsync({
          body,
          clientId: client.id,
          projectId: project.id,
        });
        void navigate(routes.quote(quote.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : pl.quotes.loadError);
      } finally {
        setWorking(false);
        setPendingRooms(null);
      }
    },
    [create, navigate, settings, project, client],
  );

  // Lista wycen projektu jest już w cache (zakładka „Wyceny"), więc pytanie
  // o pomieszczenia nie kosztuje dodatkowego zapytania o nagłówki — dopiero
  // sam dokument dociągamy na żądanie.
  const projectQuotes = useQuotesList(
    project ? { projectId: project.id, status: 'all' } : { projectId: '__none__' },
  );

  const newQuote = useCallback(async () => {
    if (!settings || !project || !client) return;

    const latest = (projectQuotes.data ?? [])[0];
    if (!latest) {
      await createWith([]);
      return;
    }

    setWorking(true);
    try {
      // `body` nie ma na liście (i nie ma prawa być) — ściągamy jeden dokument
      // dopiero wtedy, gdy naprawdę może mieć pomieszczenia do skopiowania.
      const source = await getQuote(latest.id);
      const rooms = source.body?.rooms ?? [];
      if (rooms.length === 0) {
        await createWith([]);
        return;
      }
      setPendingRooms({ quoteTitle: source.title, rooms });
    } catch {
      // Nie udało się zajrzeć do poprzedniej wyceny — to nie powód, żeby nie
      // dało się założyć nowej. Zakładamy pustą i nie zawracamy głowy.
      await createWith([]);
    } finally {
      setWorking(false);
    }
  }, [settings, project, client, projectQuotes.data, createWith]);

  return {
    newQuote,
    /** `null` = nie ma o co pytać. Obiekt = pokaż dialog kopiowania pomieszczeń. */
    pendingRooms,
    confirmCopy: () => void createWith(pendingRooms?.rooms ?? []),
    skipCopy: () => void createWith([]),
    cancelCopy: () => setPendingRooms(null),
    ready: Boolean(settings && project && client),
    working: working || create.isPending,
  };
}
