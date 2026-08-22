import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Copy, Archive, Pencil } from 'lucide-react';
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
import { useArchiveQuote, useDuplicateQuote } from '@/data/queries/useQuotes';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function QuoteRowMenu({ quoteId, title }: { quoteId: string; title: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const duplicate = useDuplicateQuote();
  const archive = useArchiveQuote();

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
        <DropdownMenuContent align="end" className="w-48">
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
    </>
  );
}
