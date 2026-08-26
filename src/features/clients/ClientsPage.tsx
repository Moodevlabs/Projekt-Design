import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/shared';
import { ClientsToolbar, type ClientStatusFilter } from './ClientsToolbar';
import { ImportClientsDialog } from './ImportClientsDialog';
import { ClientsTable } from './ClientsTable';
import { ClientFormDialog } from './ClientFormDialog';
import { useClients } from '@/data/queries/useClients';
import type { ClientSort } from '@/data/repos/clients.repo';
import type { Client } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

export function ClientsPage() {
  const [status, setStatus] = useState<ClientStatusFilter>('active');
  const [sort, setSort] = useState<ClientSort>('activity_desc');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  // Filtry idą do zapytania — szukanie i sortowanie robi Postgres. Lista
  // klientów ma rosnąć do setek i nie ma powodu ściągać jej w całości.
  const filters = useMemo(
    () => ({ status, sort, search: search.trim() || undefined }),
    [status, sort, search],
  );

  const clients = useClients(filters);
  const rows = clients.data ?? [];
  // „Zarchiwizowani" to też filtr: pusty wynik na tej pigułce nie znaczy,
  // że nie ma się klientów (zasada z T-07).
  const hasFilters = status !== 'active' || search.trim().length > 0;

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} />

      <ClientsToolbar
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        count={rows.length}
        onAdd={openNew}
        onImport={() => setImportOpen(true)}
      />

      {clients.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {pl.clients.loadError}{' '}
            <button
              type="button"
              onClick={() => void clients.refetch()}
              className="underline underline-offset-4"
            >
              {pl.common.retry}
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!clients.isLoading && !clients.isError && rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? pl.clients.noResultsTitle : pl.clients.emptyTitle}
          description={hasFilters ? pl.clients.noResultsDescription : pl.clients.emptyDescription}
          action={
            hasFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('active');
                  setSearch('');
                }}
              >
                {pl.common.all}
              </Button>
            ) : (
              <Button onClick={openNew}>
                <Plus className="size-4" aria-hidden />
                {pl.clients.first}
              </Button>
            )
          }
        />
      ) : null}

      {clients.isLoading || rows.length > 0 ? (
        <ClientsTable
          rows={rows}
          loading={clients.isLoading}
          onEdit={(client) => {
            setEditing(client);
            setFormOpen(true);
          }}
        />
      ) : null}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} />
    </div>
  );
}
