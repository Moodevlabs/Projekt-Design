import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Copy, Archive, Pencil, FolderInput, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared';
import { MoveToProjectDialog } from '@/features/projects/MoveToProjectDialog';
import { useProjectProgressPrompt } from '@/features/projects/useProjectProgressPrompt';
import { useArchiveQuote, useDuplicateQuote, useSetQuoteStatus } from '@/data/queries/useQuotes';
import type { QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Statusy, które ustawia się ręcznie z listy. `draft` jest stanem wyjściowym. */
const SETTABLE: QuoteStatus[] = ['sent', 'accepted', 'rejected'];

export function QuoteRowMenu({
  quoteId,
  title,
  clientId = null,
  projectId = null,
}: {
  quoteId: string;
  title: string;
  clientId?: string | null;
  projectId?: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const duplicate = useDuplicateQuote();
  const archive = useArchiveQuote();
  const setStatus = useSetQuoteStatus();
  const progress = useProjectProgressPrompt();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${pl.quotes.rowActions}: ${title}`}
            className="size-8"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link to={routes.quote(quoteId)}>
              <Pencil className="size-4" aria-hidden />
              {pl.common.edit}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={duplicate.isPending}
            onSelect={() => {
              duplicate.mutate(quoteId, {
                onSuccess: () => toast.success(pl.quotes.duplicated),
                onError: (error) => toast.error(error.message),
              });
            }}
          >
            <Copy className="size-4" aria-hidden />
            {pl.common.duplicate}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
            <FolderInput className="size-4" aria-hidden />
            {pl.quotes.moveToProject}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>{pl.quotes.markAs}</DropdownMenuLabel>
          {SETTABLE.map((status) => (
            <DropdownMenuItem
              key={status}
              onSelect={() => {
                setStatus.mutate(
                  { id: quoteId, status },
                  {
                    onSuccess: () => {
                      toast.success(pl.quotes.statusChanged);
                      // Zaakceptowana oferta zwykle znaczy start prac —
                      // proponujemy przestawienie teczki, nie robimy tego sami.
                      if (status === 'accepted') void progress.promptFor(projectId);
                    },
                    onError: (error) => toast.error(error.message),
                  },
                );
              }}
            >
              <CircleCheck className="size-4" aria-hidden />
              {pl.status[status]}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Archive className="size-4" aria-hidden />
            {pl.common.archive}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.quotes.archiveConfirmTitle}
        description={pl.quotes.archiveConfirmDescription}
        confirmLabel={pl.common.archive}
        destructive
        onConfirm={() => {
          archive.mutate(quoteId, {
            onSuccess: () => toast.success(pl.quotes.archivedToast),
            onError: (error) => toast.error(error.message),
          });
        }}
      />

      {/* Montowane dopiero po otwarciu — inaczej każdy wiersz listy pytałby
          o projekty i klientów, zanim ktokolwiek kliknie w menu. */}
      {moveOpen ? (
        <MoveToProjectDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          quoteId={quoteId}
          clientId={clientId}
          currentProjectId={projectId}
        />
      ) : null}
    </>
  );
}
