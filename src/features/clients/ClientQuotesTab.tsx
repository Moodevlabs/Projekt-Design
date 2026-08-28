import { FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { QuotesTable } from '@/features/quotes/list/QuotesTable';
import { NewDocumentMenu } from '@/features/quotes/list/NewDocumentMenu';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useNewQuoteForClient } from './useNewQuoteForClient';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

/**
 * Dokumenty jednego klienta (od T-100 wszystkie rodzaje, z kolumna „Rodzaj").
 *
 * Filtruje BAZA (`client_id`), a nie przeglądarka — ta sama zasada co na
 * liście wycen. Tabela jest ta sama co w rejestrze: dwa wyglądy tej samej
 * listy znaczyłyby dwa miejsca do poprawiania przy każdej zmianie kolumn.
 */
export function ClientQuotesTab({ client }: { client: Client }) {
  const quotes = useQuotesList({ clientId: client.id, status: 'all' });
  const { newQuote, ready } = useNewQuoteForClient();
  const rows = quotes.data ?? [];

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

  const addButton = (
    <NewDocumentMenu disabled={!ready} onSelect={(kind) => newQuote(client, kind)} />
  );

  if (!quotes.isLoading && rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={pl.clients.quotesEmptyTitle}
        description={pl.clients.quotesEmptyDescription}
        action={addButton}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{addButton}</div>
      <QuotesTable rows={rows} loading={quotes.isLoading} showKind />
    </div>
  );
}
