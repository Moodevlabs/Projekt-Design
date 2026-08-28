import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { QuotesToolbar, ALL_CITIES, ALL_CLIENTS, type StatusFilter } from './QuotesToolbar';
import { QuotesTable } from './QuotesTable';
import { useRegisterExport } from './useRegisterExport';
import { useQuoteCities, useQuotesList } from '@/data/queries/useQuotes';
import { useClients } from '@/data/queries/useClients';
import type { QuoteSort } from '@/data/repos/quotes.repo';
import { DOCUMENT_KINDS } from '@/domain/documents';
import type { DocKind } from '@/domain/quote';
import { cn } from '@/lib/utils';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Rejestr „Dokumenty" (T-100).
 *
 * Cztery zakladki — jedna na rodzaj dokumentu. To NIE jest filtr obok
 * pozostalych: termin nie ma sumy, cennik nie ma statusu akceptacji, wiec
 * jedna wspolna lista mieszalaby kolumny, ktore dla polowy wierszy nic nie
 * znacza. Zakladka mowi, na co patrzysz, a reszta filtrow dziala w jej obrebie.
 */
export function QuotesListPage() {
  const [kind, setKind] = useState<DocKind>('offer');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<QuoteSort>('updated_desc');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState<string>(ALL_CITIES);
  const [clientId, setClientId] = useState<string>(ALL_CLIENTS);

  // Filtry idą do zapytania, więc filtrowanie i sortowanie robi Postgres,
  // a nie przeglądarka — lista może urosnąć do tysięcy wycen.
  const filters = useMemo(
    () => ({
      docKind: kind,
      status,
      sort,
      search: search.trim() || undefined,
      city: city === ALL_CITIES ? undefined : city,
      clientId: clientId === ALL_CLIENTS ? undefined : clientId,
    }),
    [kind, status, sort, search, city, clientId],
  );

  const quotes = useQuotesList(filters);
  const cities = useQuoteCities();
  // Do filtra bierzemy takze zarchiwizowanych: wyceny sprzed zamkniecia
  // wspolpracy dalej sa w rejestrze i trzeba je umiec odfiltrowac.
  const clients = useClients({ status: 'all', sort: 'name_asc' });
  const register = useRegisterExport();

  const hasFilters =
    status !== 'all' || search.trim().length > 0 || city !== ALL_CITIES || clientId !== ALL_CLIENTS;
  const rows = quotes.data ?? [];

  const resetFilters = () => {
    setStatus('all');
    setSearch('');
    setCity(ALL_CITIES);
    setClientId(ALL_CLIENTS);
  };

  return (
    <div className="space-y-5">
      <KindTabs value={kind} onChange={setKind} />

      <QuotesToolbar
        kind={kind}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        city={city}
        onCityChange={setCity}
        cities={cities.data ?? []}
        clientId={clientId}
        onClientChange={setClientId}
        clients={clients.data ?? []}
        sort={sort}
        onSortChange={setSort}
        // Eksportujemy TO, CO WIDAC po filtrach — plik inny niż lista na
        // ekranie byłby gorszy niż brak eksportu.
        onExport={(format) => void register.exportRegister(filters, format)}
        exporting={register.exporting}
      />

      {quotes.isError ? (
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
      ) : null}

      {!quotes.isLoading && !quotes.isError && rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasFilters ? pl.quotes.noResultsTitle : pl.quotes.emptyKindTitle[kind]}
          description={
            hasFilters ? pl.quotes.noResultsDescription : pl.quotes.emptyKindDescription[kind]
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                {pl.common.all}
              </Button>
            ) : (
              <Button asChild>
                <Link to={routes.documentNew(kind)}>
                  <Plus className="size-4" aria-hidden />
                  {pl.quotes.newOfKind[kind]}
                </Link>
              </Button>
            )
          }
        />
      ) : null}

      {quotes.isLoading || rows.length > 0 ? (
        <QuotesTable rows={rows} loading={quotes.isLoading} showTotal={kind === 'offer'} />
      ) : null}
    </div>
  );
}

function KindTabs({ value, onChange }: { value: DocKind; onChange: (next: DocKind) => void }) {
  return (
    <div role="tablist" aria-label={pl.quotes.kindTabsLabel} className="border-hair flex gap-1 border-b">
      {DOCUMENT_KINDS.map((kind) => {
        const active = kind === value;
        return (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(kind)}
            className={cn(
              'relative -mb-px px-3 py-2.5 text-sm transition-colors',
              active
                ? 'text-ink border-b-2 border-[var(--ink)] font-semibold'
                : 'text-ink-soft hover:text-ink border-b-2 border-transparent',
            )}
          >
            {pl.quotes.kindTabs[kind]}
          </button>
        );
      })}
    </div>
  );
}
