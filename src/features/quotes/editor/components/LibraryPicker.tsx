import { useMemo, useState } from 'react';
import { Library } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AddLink } from './AddLink';
import { useLibraryGroups, useLibraryItems } from '@/data/queries/useLibrary';
import type { LibraryItem } from '@/data/repos/library.repo';
import { byCategory } from './group-library-items';
import { newGroup, type Group, type Item } from '@/domain/quote';
import { libraryItemToQuoteItem, librarySnapshotToQuoteItem } from '@/domain/library/schema';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

export interface LibraryPickerProps {
  /** Kategoria wypychana na górę listy — nazwa grupy albo tytuł sekcji. */
  priorityCategory?: string;
  onPickItem: (item: Item) => void;
  /** Gdy podane, popover dostaje drugą zakładkę z zestawami. */
  onPickGroup?: (group: Group) => void;
}

/**
 * Wybór z biblioteki. `Command` daje szukajkę, nawigację strzałkami i Enter
 * bez dopisywania własnej obsługi klawiatury.
 */
export function LibraryPicker({ priorityCategory, onPickItem, onPickGroup }: LibraryPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'items' | 'groups'>('items');

  // Biblioteka jest mała i współdzieli cache TanStack Query z resztą aplikacji,
  // więc kilkanaście pickerów na stronie pobiera ją raz.
  const items = useLibraryItems();
  const groups = useLibraryGroups();

  const grouped = useMemo(
    () => byCategory(items.data ?? [], priorityCategory),
    [items.data, priorityCategory],
  );

  const pickItem = (libraryItem: LibraryItem) => {
    onPickItem(libraryItemToQuoteItem(libraryItem));
    setOpen(false);
  };

  const pickGroup = (groupId: string) => {
    const source = groups.data?.find((candidate) => candidate.id === groupId);
    if (!source || !onPickGroup) return;

    onPickGroup(
      newGroup({
        name: source.name,
        items: source.items.map((snapshot) => librarySnapshotToQuoteItem(snapshot)),
      }),
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AddLink icon={Library} onClick={() => setOpen(true)}>
          {pl.editor.fromLibrary}
        </AddLink>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[300px] p-0">
        {onPickGroup ? (
          <div className="border-hair flex border-b p-1">
            {(['items', 'groups'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={
                  tab === value
                    ? 'bg-primary text-primary-foreground flex-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium'
                    : 'text-ink-soft hover:text-ink flex-1 rounded-[var(--radius-control)] px-2 py-1 text-xs'
                }
              >
                {value === 'items' ? pl.editor.pickerItemsTab : pl.editor.pickerGroupsTab}
              </button>
            ))}
          </div>
        ) : null}

        <Command>
          <CommandInput placeholder={pl.editor.pickerSearch} />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>{pl.editor.pickerEmpty}</CommandEmpty>

            {tab === 'items'
              ? grouped.map(([category, categoryItems]) => (
                  <CommandGroup key={category} heading={category}>
                    {categoryItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.name} ${item.description} ${category}`}
                        onSelect={() => pickItem(item)}
                        className="flex items-center gap-3"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                        <span className="tabular text-ink-soft shrink-0 text-xs">
                          {formatMoney(item.unitPriceCents)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
              : (groups.data ?? []).map((group) => (
                  <CommandItem
                    key={group.id}
                    value={group.name}
                    onSelect={() => pickGroup(group.id)}
                    className="flex items-center gap-3"
                  >
                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                    <span className="text-ink-soft shrink-0 text-xs">
                      {pl.editor.pickerGroupItems(group.items.length)}
                    </span>
                  </CommandItem>
                ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
