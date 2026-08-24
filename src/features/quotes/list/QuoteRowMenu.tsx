import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  FolderInput,
  CircleCheck,
  GitBranch,
} from 'lucide-react';
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
import {
  useArchiveQuote,
  useAcceptReplacing,
  useCreateQuoteVersion,
  useDuplicateQuote,
  useSetQuoteStatus,
} from '@/data/queries/useQuotes';
import { AcceptedConflictError } from '@/data/repos/quotes.repo';
import { canCreateVersion, type QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/** Statusy, które ustawia się ręcznie z listy. `draft` jest stanem wyjściowym. */
const SETTABLE: QuoteStatus[] = ['sent', 'accepted', 'rejected'];

export function QuoteRowMenu({
  quoteId,
  title,
  clientId = null,
  projectId = null,
  status = 'draft',
}: {
  quoteId: string;
  title: string;
  clientId?: string | null;
  projectId?: string | null;
  status?: QuoteStatus;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const duplicate = useDuplicateQuote();
  const archive = useArchiveQuote();
  const setStatus = useSetQuoteStatus();
  const newVersion = useCreateQuoteVersion();
  const acceptReplacing = useAcceptReplacing();
  const progress = useProjectProgressPrompt();

  const changeStatus = (next: QuoteStatus) => {
    setStatus.mutate(
      { id: quoteId, status: next },
      {
        onSuccess: () => {
          toast.success(pl.quotes.statusChanged);
          // Zaakceptowana oferta zwykle znaczy start prac — proponujemy
          // przestawienie teczki, nie robimy tego sami.
          if (next === 'accepted') void progress.promptFor(projectId);
        },
        onError: (error) => {
          // Projekt ma juz zaakceptowana wycene — pytamy, zamiast pokazywac
          // surowy blad z bazy (koncepcja §4 regula 3).
          if (error instanceof AcceptedConflictError) setReplaceOpen(true);
          else toast.error(error.message);
        },
      },
    );
  };

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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link to={routes.quote(quoteId)}>
              <Pencil className="size-4" aria-hidden />
              {pl.common.edit}
            </Link>
          </DropdownMenuItem>

          {/*
            „Nowa wersja" i „Duplikuj" to DWIE ROZNE rzeczy i oba zostają
            (koncepcja §4 reguła 5): wersja kontynuuje linię tej samej
            inwestycji, duplikat zakłada nową dla innego klienta. Tooltip
            w `title` mówi to wprost, bo same nazwy tego nie rozstrzygają.
          */}
          {canCreateVersion(status) ? (
            <DropdownMenuItem
              disabled={newVersion.isPending}
              title={pl.quotes.newVersionHint}
              onSelect={() => {
                newVersion.mutate(quoteId, {
                  onSuccess: (kopia) => toast.success(pl.quotes.versionCreated(`v${kopia.version}`)),
                  onError: (error) => toast.error(error.message),
                });
              }}
            >
              <GitBranch className="size-4" aria-hidden />
              {pl.quotes.newVersion}
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            disabled={duplicate.isPending}
            title={pl.quotes.duplicateHint}
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
          {SETTABLE.map((option) => (
            <DropdownMenuItem key={option} onSelect={() => changeStatus(option)}>
              <CircleCheck className="size-4" aria-hidden />
              {pl.status[option]}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          {/* Kosz, nie archiwum wersji — od T-57 to dwie różne rzeczy. */}
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" aria-hidden />
            {pl.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.quotes.archiveConfirmTitle}
        description={pl.quotes.archiveConfirmDescription}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => {
          archive.mutate(quoteId, {
            onSuccess: () => toast.success(pl.quotes.archivedToast),
            onError: (error) => toast.error(error.message),
          });
        }}
      />

      <ConfirmDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        title={pl.quotes.replaceAcceptedTitle}
        description={pl.quotes.replaceAcceptedDescription}
        confirmLabel={pl.quotes.replaceAcceptedConfirm}
        onConfirm={() => {
          if (!projectId) return;
          acceptReplacing.mutate(
            { id: quoteId, projectId },
            {
              onSuccess: () => {
                toast.success(pl.quotes.replaceAccepted);
                void progress.promptFor(projectId);
              },
              onError: (error) => toast.error(error.message),
            },
          );
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
