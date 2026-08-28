import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { CopyRoomsDialog } from './CopyRoomsDialog';
import { QuotesByLineage } from '@/features/quotes/list/QuotesByLineage';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useNewQuoteForProject } from './useNewQuoteForProject';
import type { Client } from '@/domain/client/schema';
import type { Project } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

/**
 * Dokumentacja jednej teczki — wycena + termin + etapy + cennik (T-111).
 *
 * Filtruje baza (`project_id`), a tabela jest ta sama co w rejestrze — dwa
 * wyglądy tej samej listy znaczyłyby dwa miejsca do poprawiania.
 *
 * Wersje są **zwinięte do linii** (T-57): wiersz to najnowsza propozycja,
 * starsze pod rozwinięciem. Teczka z trzema podejściami do tej samej oferty
 * ma wyglądać na jedną ofertę, a nie na trzy.
 */
export function ProjectQuotesTab({ project, client }: { project: Project; client: Client | null }) {
  const quotes = useQuotesList({ projectId: project.id, status: 'all' });
  const nowa = useNewQuoteForProject(project, client);
  const rows = quotes.data ?? [];

  const addButton = (
    <Button disabled={!nowa.ready || nowa.working} onClick={() => void nowa.newQuote()}>
      <Plus className="size-4" aria-hidden />
      {pl.projects.newQuote}
    </Button>
  );

  if (quotes.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {pl.quotes.loadError}{' '}
          <button
            type="button"
            onClick={() => void quotes.refetch()}
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
      {!quotes.isLoading && rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={pl.projects.quotesEmptyTitle}
          description={pl.projects.quotesEmptyDescription}
          action={addButton}
        />
      ) : (
        <>
          <div className="flex justify-end">{addButton}</div>
          <QuotesByLineage rows={rows} loading={quotes.isLoading} />
        </>
      )}

      {/*
        Pomieszczenia z poprzedniej wyceny — PYTAMY, nie kopiujemy automatem
        (koncepcja §2 reguła 4). Druga oferta w teczce bywa na zupełnie inny
        zakres i podsuwanie jej cudzego układu pomieszczeń byłoby myleniem
        wygody z domysłem.
      */}
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
