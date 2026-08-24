import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { QuotesTable } from '@/features/quotes/list/QuotesTable';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useNewQuoteForClient } from './useNewQuoteForClient';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

/**
 * Wyceny jednego klienta.
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

  if (!quotes.isLoading && rows.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={pl.clients.quotesEmptyTitle}
        description={pl.clients.quotesEmptyDescription}
        action={
          <Button disabled={!ready} onClick={() => newQuote(client)}>
            <Plus className="size-4" aria-hidden />
            {pl.clients.newQuote}
          </Button>
        }
      />
    );
  }

  return <QuotesTable rows={rows} loading={quotes.isLoading} />;
}
