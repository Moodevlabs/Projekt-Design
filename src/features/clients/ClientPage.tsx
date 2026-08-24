import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Pencil, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, Money } from '@/components/shared';
import { ClientStatusBadge } from './ClientsTable';
import { ClientFormDialog } from './ClientFormDialog';
import { ClientQuotesTab } from './ClientQuotesTab';
import { ClientNotesTab } from './ClientNotesTab';
import { ClientRowMenu } from './ClientRowMenu';
import { useClientOverview } from '@/data/queries/useClients';
import { useNewQuoteForClient } from './useNewQuoteForClient';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * Karta klienta (05-UI §3).
 *
 * Zakładek jest dwie: **Wyceny** i **Notatki**. „Projekty", „Dokumenty"
 * i „Pliki" NIE SĄ renderowane, bo tych funkcji jeszcze nie ma (T-54…T-56) —
 * zakładka z napisem „wkrótce" jest gorsza niż jej brak (05-UI §3a.8,
 * zasada z T-44). Wejdą razem ze swoimi danymi.
 */
export function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const client = useClientOverview(id);
  const [editOpen, setEditOpen] = useState(false);
  const { newQuote, ready } = useNewQuoteForClient();

  if (client.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (client.isError || !client.data) {
    return (
      <EmptyState
        icon={Users}
        title={pl.clients.notFoundTitle}
        description={pl.clients.notFoundDescription}
        action={
          <Button asChild variant="outline">
            <Link to={routes.clients}>{pl.clients.backToList}</Link>
          </Button>
        }
      />
    );
  }

  const data = client.data;
  const contact = [data.phone, data.email].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5">
      <Link
        to={routes.clients}
        className="text-ink-soft hover:text-ink inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {pl.clients.backToList}
      </Link>

      <header className="card-surface flex flex-wrap items-start justify-between gap-5 p-6">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-ink truncate text-xl font-semibold">{data.name}</h1>
            <ClientStatusBadge status={data.status} />
          </div>
          <p className="text-ink-soft text-sm">{contact || pl.clients.noContact}</p>
          {data.address || data.city ? (
            <p className="text-ink-soft flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5" aria-hidden />
              {[data.address, data.city].filter(Boolean).join(', ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <Stat label={pl.clients.quotesCount} value={String(data.quotesCount)} />
          <Stat
            label={pl.clients.acceptedValue}
            value={
              data.acceptedNetCents > 0 ? (
                <Money cents={data.acceptedNetCents} />
              ) : (
                pl.clients.noValue
              )
            }
          />
          <Stat label={pl.clients.lastActivity} value={formatRelativeDay(data.lastActivityAt)} />

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" aria-hidden />
              {pl.common.edit}
            </Button>
            <Button disabled={!ready} onClick={() => newQuote(data)}>
              <Plus className="size-4" aria-hidden />
              {pl.clients.newQuote}
            </Button>
            <ClientRowMenu client={data} onEdit={() => setEditOpen(true)} />
          </div>
        </div>
      </header>

      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList aria-label={pl.clients.title}>
          <TabsTrigger value="quotes">{pl.clients.tabQuotes}</TabsTrigger>
          <TabsTrigger value="notes">{pl.clients.tabNotes}</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <ClientQuotesTab client={data} />
        </TabsContent>
        <TabsContent value="notes">
          <ClientNotesTab client={data} />
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={data} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-24">
      <p className="text-ink-soft text-xs tracking-wide uppercase">{label}</p>
      <p className="text-ink mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
