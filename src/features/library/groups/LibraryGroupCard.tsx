import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/shared';
import { calcGroupTotals } from '@/domain/quote';
import { librarySnapshotToQuoteItem, type LibraryGroup } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type LibraryGroupCardProps = {
  group: LibraryGroup;
  onRename: (name: string) => void;
  onDelete: () => void;
  saving?: boolean;
};

/**
 * Karta grupy bibliotecznej: nazwa (edycja w miejscu), liczba pozycji, suma
 * netto i rozwijany podgląd zawartości.
 *
 * Suma liczy się w domenie (`calcGroupTotals`), a nie w komponencie — snapshoty
 * z grupy zamieniamy na pozycje wyceny, żeby rabaty odjęły się tą samą regułą
 * co w edytorze i w PDF.
 */
export function LibraryGroupCard({
  group,
  onRename,
  onDelete,
  saving = false,
}: LibraryGroupCardProps) {
  const [name, setName] = useState(group.name);
  const [open, setOpen] = useState(false);
  const seen = useRef(group.name);

  useEffect(() => {
    // Świeże dane wpuszczamy tylko wtedy, gdy nie kasują niezapisanej edycji.
    setName((previous) => (previous === seen.current ? group.name : previous));
    seen.current = group.name;
  }, [group.name]);

  const totals = useMemo(
    () =>
      calcGroupTotals({
        id: group.id,
        name: group.name,
        items: group.items.map(librarySnapshotToQuoteItem),
      }),
    [group.id, group.name, group.items],
  );

  const dirty = name !== group.name;
  const label = group.name || pl.library.newGroupName;
  const listId = `library-group-items-${group.id}`;

  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <header className="flex items-start justify-between gap-2">
        <Input
          value={name}
          aria-label={`${pl.library.groupNameLabel}: ${label}`}
          placeholder={pl.library.newGroupName}
          onChange={(event) => setName(event.target.value)}
          className="text-ink h-8 border-transparent px-2 text-sm font-semibold shadow-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={pl.library.deleteGroup(label)}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </header>

      <div className="text-ink-soft flex items-center justify-between gap-3 text-sm">
        <span>{pl.library.itemsCount(group.items.length)}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs">{pl.library.groupTotal}</span>
          <Money cents={totals.netCents} className="text-ink text-sm font-medium" />
        </span>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? pl.library.hideGroupItems(label) : pl.library.showGroupItems(label)}
        onClick={() => setOpen((previous) => !previous)}
        className="text-ink-soft hover:text-ink focus-visible:ring-ring flex items-center gap-1 self-start rounded-[var(--radius-control)] text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        {pl.library.items}
      </button>

      {open ? (
        <ul id={listId} className="border-hair flex flex-col gap-2 border-t pt-3">
          {group.items.length === 0 ? (
            <li className="text-ink-soft text-sm">{pl.library.groupItemsEmpty}</li>
          ) : (
            group.items.map((item, index) => (
              <li
                key={`${item.libraryItemId ?? item.name}-${index}`}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-ink min-w-0 truncate">{item.name}</span>
                <Money
                  cents={item.unitPriceCents}
                  variant={item.kind === 'discount' ? 'discount' : 'default'}
                  className="text-sm"
                />
              </li>
            ))
          )}
        </ul>
      ) : null}

      {dirty ? (
        <div className="border-hair flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={pl.library.cancelGroup(label)}
            onClick={() => setName(group.name)}
          >
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            aria-label={pl.library.saveGroup(label)}
            onClick={() => onRename(name)}
          >
            {pl.common.save}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
