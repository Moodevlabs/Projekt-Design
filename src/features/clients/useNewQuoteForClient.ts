import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateQuote } from '@/data/queries/useQuotes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { quoteBodyFromSettings, type DocKind } from '@/domain/quote';
import { defaultTitleForKind } from '@/domain/documents';
import { clientSnapshot, type Client } from '@/domain/client/schema';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * „Nowa wycena" z karty klienta.
 *
 * Dokument powstaje z ustawieniami workspace'u (VAT, waluta, wstęp) **i**
 * z danymi inwestora przepisanymi z kartoteki. To kopia, nie referencja
 * (CLAUDE.md §14) — od tej chwili wycena żyje własnym życiem.
 *
 * Czekamy na ustawienia zanim cokolwiek utworzymy: wycena zakłada się RAZ,
 * więc założona przed ich wczytaniem miałaby domyślny VAT i nie dałoby się
 * tego naprawić inaczej niż ręcznie (ta sama pułapka co w `NewQuoteRedirect`).
 */
export function useNewQuoteForClient() {
  const navigate = useNavigate();
  const create = useCreateQuote();
  const workspace = useWorkspace();
  const settings = workspace.data?.settings;

  const newQuote = useCallback(
    (client: Client, docKind: DocKind = 'offer') => {
      if (!settings) return;

      const body = quoteBodyFromSettings(settings, { title: defaultTitleForKind(docKind) });
      body.client = clientSnapshot(client);

      void create
        .mutateAsync({ body, clientId: client.id, docKind })
        .then((quote) => navigate(routes.quote(quote.id)))
        .catch((reason: unknown) => {
          toast.error(reason instanceof Error ? reason.message : pl.quotes.loadError);
        });
    },
    [create, navigate, settings],
  );

  return { newQuote, ready: Boolean(settings), pending: create.isPending };
}
