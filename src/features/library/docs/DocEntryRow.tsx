import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared';
import { DocEntryForm } from './DocEntryForm';
import { docEntrySummary } from './doc-entry-summary';
import { useDeleteDocLibraryEntry, useUpdateDocLibraryEntry } from '@/data/queries/useLibraryDocs';
import type { DocLibraryRow } from '@/data/repos/library-docs.repo';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import { categorySwatch } from '@/features/library/categories/swatches';
import type { LibraryColor } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

/**
 * Wiersz biblioteki dokumentów: nazwa + streszczenie, rozwijany do formularza.
 *
 * Zapis jest **jawny** („Zapisz"), nie autozapis — wpis ma kilka pól, które
 * zmienia się razem (cena od/do, jednostka), i zapis po każdym klawiszu
 * wysyłałby do bazy stany pośrednie, których nikt nie chciał.
 */
export function DocEntryRow<K extends DocLibraryKind>({
  kind,
  row,
  category,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  kind: K;
  row: DocLibraryRow<K>;
  /**
   * Grupa wpisu (T-121) — sama etykieta, nie cały obiekt: wiersz ma ją tylko
   * pokazać. Przypisanie dzieje się w podzakładce „Grupy", tak jak przy
   * usługach dzieje się w edytorze usługi.
   */
  category?: { name: string; color: LibraryColor | null } | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const update = useUpdateDocLibraryEntry(kind);
  const remove = useDeleteDocLibraryEntry(kind);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const save = (payload: DocLibraryPayloadByKind[K]) => {
    update.mutate(
      { id: row.id, payload },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(pl.library.docs.saved);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const label = row.name || pl.library.docs.newLabel;

  return (
    <li className="card-surface p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveUp}
            aria-label={pl.library.moveUp}
            onClick={onMoveUp}
          >
            <ChevronUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!canMoveDown}
            aria-label={pl.library.moveDown}
            onClick={onMoveDown}
          >
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-ink truncate text-sm font-medium">{label}</span>
            {category ? (
              <span className="text-ink-soft flex shrink-0 items-center gap-1 text-[11px]">
                <span
                  aria-hidden
                  className="border-hair size-2 shrink-0 rounded-full border"
                  style={{ backgroundColor: categorySwatch(category.color) }}
                />
                {category.name}
              </span>
            ) : null}
            {row.isSample ? <Badge variant="outline">{pl.library.docs.sampleBadge}</Badge> : null}
          </div>
          <p className="text-ink-soft truncate text-xs">
            {row.entry ? docEntrySummary(kind, row.entry.payload) : pl.library.docs.corrupted}
          </p>
        </div>

        {row.entry ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={pl.library.docs.editLabel(label)}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="text-ink-soft hover:text-destructive size-8"
          aria-label={pl.library.docs.deleteLabel(label)}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {open && row.entry ? (
        <div className="border-hair mt-3 border-t pt-3">
          <DocEntryForm
            kind={kind}
            initial={row.entry.payload}
            saving={update.isPending}
            onSave={save}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.library.docs.deleteTitle}
        description={pl.library.docs.deleteDescription(label)}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() =>
          remove.mutate(row.id, {
            onSuccess: () => toast.success(pl.library.docs.deleted),
            onError: (error) => toast.error(error.message),
          })
        }
      />
    </li>
  );
}
