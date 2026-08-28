import { FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NewDocumentMenu } from '@/features/quotes/list/NewDocumentMenu';
import { EmptyState } from '@/components/shared';
import { CopyRoomsDialog } from './CopyRoomsDialog';
import { QuotesByLineage } from '@/features/quotes/list/QuotesByLineage';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useNewQuoteForProject } from './useNewQuoteForProject';
import type { Client } from '@/domain/client/schema';
import type { Project } from '@/domain/project/schema';
import { pl } from '@/i18n/pl';

/**
 * Dokumenty jednej teczki (od T-100 wszystkie rodzaje, z kolumna „Rodzaj").
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
    <NewDocumentMenu
      disabled={!nowa.ready || nowa.working}
      onSelect={(kind) => void nowa.newQuote(kind)}
    />
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
          <QuotesByLineage rows={rows} loading={quotes.isLoading} showKind />
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
