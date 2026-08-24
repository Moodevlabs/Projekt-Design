import { useState } from 'react';
import { Archive, ArchiveRestore, FilePlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared';
import { useDeleteClient, useSetClientStatus } from '@/data/queries/useClients';
import { useNewQuoteForClient } from './useNewQuoteForClient';
import type { ClientOverview } from '@/domain/client/schema';
import { pl } from '@/i18n/pl';

export function ClientRowMenu({
  client,
  onEdit,
}: {
  client: ClientOverview;
  onEdit: () => void;
}) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const setStatus = useSetClientStatus();
  const remove = useDeleteClient();
  const { newQuote, ready } = useNewQuoteForClient();

  const archived = client.status === 'archived';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${pl.clients.rowActions}: ${client.name}`}
            className="size-8"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => onEdit()}>
            <Pencil className="size-4" aria-hidden />
            {pl.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!ready} onSelect={() => newQuote(client)}>
            <FilePlus className="size-4" aria-hidden />
            {pl.clients.newQuote}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {archived ? (
            <DropdownMenuItem
              onSelect={() => {
                setStatus.mutate(
                  { id: client.id, status: 'active' },
                  {
                    onSuccess: () => toast.success(pl.clients.restored),
                    onError: (error) => toast.error(error.message),
                  },
                );
              }}
            >
              <ArchiveRestore className="size-4" aria-hidden />
              {pl.clients.restore}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
              <Archive className="size-4" aria-hidden />
              {pl.clients.archive}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {pl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={pl.clients.archiveConfirmTitle}
        description={pl.clients.archiveConfirmDescription}
        confirmLabel={pl.clients.archive}
        onConfirm={() => {
          setStatus.mutate(
            { id: client.id, status: 'archived' },
            {
              onSuccess: () => toast.success(pl.clients.archived),
              onError: (error) => toast.error(error.message),
            },
          );
        }}
      />

      {/* Dialog mówi WPROST, ile wycen wisi na tym kliencie (koncepcja §2
          reguła 5) — „czy na pewno?" bez liczby zmusza do zgadywania. */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={pl.clients.deleteConfirmTitle}
        description={pl.clients.deleteConfirmDescription(client.quotesCount)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          remove.mutate(client.id, {
            onSuccess: () => toast.success(pl.clients.deleted),
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </>
  );
}
