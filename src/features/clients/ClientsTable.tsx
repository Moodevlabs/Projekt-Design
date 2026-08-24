import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Money } from '@/components/shared';
import { ClientRowMenu } from './ClientRowMenu';
import type { ClientOverview } from '@/domain/client/schema';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Liczba kolumn — trzyma `colSpan` szkieletu w zgodzie z nagłówkiem. */
const COLUMNS = 7;

export function ClientsTable({
  rows,
  loading,
  onEdit,
}: {
  rows: ClientOverview[];
  loading: boolean;
  onEdit: (client: ClientOverview) => void;
}) {
  return (
    <div className="card-surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{pl.clients.name}</TableHead>
            <TableHead className="w-40">{pl.clients.city}</TableHead>
            <TableHead className="w-28 text-right">{pl.clients.quotesCount}</TableHead>
            <TableHead className="w-40 text-right">{pl.clients.acceptedValue}</TableHead>
            <TableHead className="w-40">{pl.clients.lastActivity}</TableHead>
            <TableHead className="w-32">{pl.clients.statusColumn}</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : (
            rows.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="max-w-0">
                  <Link
                    to={routes.client(client.id)}
                    className="block truncate font-medium underline-offset-4 hover:underline"
                  >
                    {client.name}
                  </Link>
                  {/* Kontakt pod nazwą, a nie w osobnej kolumnie: telefon
                      i e-mail rzadko są potrzebne oba naraz, a szeroka
                      kolumna z jednym z nich to zmarnowane miejsce. */}
                  <span className="text-ink-soft block truncate text-sm">
                    {[client.phone, client.email].filter(Boolean).join(' · ') ||
                      pl.clients.noContact}
                  </span>
                </TableCell>
                <TableCell className="text-ink-soft max-w-0 truncate">
                  {client.city || pl.clients.noCity}
                </TableCell>
                <TableCell className="text-right tabular-nums">{client.quotesCount}</TableCell>
                <TableCell className="text-right">
                  {client.acceptedNetCents > 0 ? (
                    <Money cents={client.acceptedNetCents} />
                  ) : (
                    <span className="text-ink-soft">{pl.clients.noValue}</span>
                  )}
                </TableCell>
                <TableCell className="text-ink-soft text-sm">
                  {formatRelativeDay(client.lastActivityAt)}
                </TableCell>
                <TableCell>
                  <ClientStatusBadge status={client.status} />
                </TableCell>
                <TableCell>
                  <ClientRowMenu client={client} onEdit={() => onEdit(client)} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Status klienta to dwa stany, nie tor postępu — dlatego pigułka, a nie
 * `StatusMark` z wycen. Ten sam kształt sugerowałby, że „zarchiwizowany" jest
 * kolejnym etapem współpracy, a jest jej zamknięciem.
 */
export function ClientStatusBadge({ status }: { status: ClientOverview['status'] }) {
  return (
    <span
      className={cn(
        'rounded-[var(--radius-pill)] px-2.5 py-1 text-xs whitespace-nowrap',
        status === 'archived'
          ? 'bg-surface-2 text-ink-soft border-hair border'
          : 'bg-primary/10 text-ink',
      )}
    >
      {pl.clients.status[status]}
    </span>
  );
}

function LoadingRows() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((row) => (
        <TableRow key={row}>
          <TableCell colSpan={COLUMNS}>
            <Skeleton className="h-6 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
