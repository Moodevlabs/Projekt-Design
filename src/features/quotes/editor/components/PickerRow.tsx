import { Check, TriangleAlert } from 'lucide-react';
import { CommandItem } from '@/components/ui/command';
import type { LibraryItem } from '@/data/repos/library.repo';
import { libraryRowSummary } from './library-row-summary';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Jeden wiersz pickera biblioteki (T-70).
 *
 * Trzy rzeczy, których wcześniej nie było:
 *  - **sposób wyceny obok stawki** — „250,00 zł" przy usłudze liczonej za
 *    pomieszczenie wyglądało na cenę końcową, a jest stawką za jedno;
 *  - **licznik dodań**, bo popover zostaje otwarty i bez niego nie wiadomo,
 *    co już wpadło do dokumentu;
 *  - **ostrzeżenie o braku pomieszczeń** przy usługach, które bez nich policzą
 *    samą bazę (często zero).
 */
export function PickerRow({
  item,
  addedCount,
  roomCount,
  onAddRooms,
  onPick,
}: {
  item: LibraryItem;
  addedCount: number;
  roomCount: number;
  onAddRooms?: () => void;
  onPick: () => void;
}) {
  const summary = libraryRowSummary(item);
  const brakujePomieszczen = summary.dependsOnRooms && roomCount === 0;

  return (
    <CommandItem
      value={`${item.name} ${item.description} ${item.categoryName}`}
      onSelect={onPick}
      className="flex flex-col items-stretch gap-0.5 py-2"
    >
      <div className="flex items-center gap-3">
        <span className={cn('min-w-0 flex-1 truncate', addedCount > 0 && 'text-ink font-medium')}>
          {item.name}
        </span>

        {addedCount > 0 ? (
          <span className="text-ink-soft flex shrink-0 items-center gap-1 text-[11px]">
            <Check className="size-3" aria-hidden />
            {pl.editor.pickerAdded(addedCount)}
          </span>
        ) : null}
      </div>

      <div className="text-ink-soft flex items-center gap-2 text-[11px]">
        <span className="shrink-0">{summary.mode}</span>
        {summary.price ? (
          <>
            <span aria-hidden>·</span>
            <span className="tabular shrink-0">{summary.price}</span>
          </>
        ) : null}
      </div>

      {brakujePomieszczen ? (
        <div className="text-ink-soft mt-0.5 flex items-center gap-1.5 text-[11px]">
          <TriangleAlert className="size-3 shrink-0 text-[var(--doc-terracotta)]" aria-hidden />
          <span className="min-w-0 flex-1">{pl.editor.pickerNoRooms}</span>
          {onAddRooms ? (
            /*
             * `onMouseDown` z `preventDefault`, a nie `onClick`: `CommandItem`
             * wybiera pozycję już przy wciśnięciu, więc zwykły przycisk
             * w środku wiersza najpierw dodałby usługę, a dopiero potem
             * otworzył panel pomieszczeń.
             */
            <button
              type="button"
              className="text-ink hover:text-[var(--doc-sage)] shrink-0 underline underline-offset-2"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAddRooms();
              }}
            >
              {pl.editor.pickerNoRoomsAction}
            </button>
          ) : null}
        </div>
      ) : null}
    </CommandItem>
  );
}
