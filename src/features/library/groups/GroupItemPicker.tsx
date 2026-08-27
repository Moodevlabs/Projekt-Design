import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useLibraryItems } from '@/data/queries/useLibrary';
import { libraryItemToSnapshot, type LibraryItemSnapshot } from '@/domain/library/schema';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

type GroupItemPickerProps = {
  /** Nazwa zestawu — trafia do etykiety, bo pickerów jest tylu, co kart. */
  groupName: string;
  onPick: (snapshot: LibraryItemSnapshot) => void;
};

/**
 * „Dodaj pozycję" na karcie zestawu. Wybiera z biblioteki pozycji i wkłada do
 * zestawu **snapshot**, nie klucz obcy — zestaw ma zostać taki, jaki był
 * w chwili złożenia, nawet gdy pozycja źródłowa później zdrożeje.
 */
export function GroupItemPicker({ groupName, onPick }: GroupItemPickerProps) {
  const [open, setOpen] = useState(false);
  const items = useLibraryItems();
  const rows = items.data ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={pl.library.groupAddItemFor(groupName)}
          className="self-start"
        >
          <Plus className="size-4" aria-hidden />
          {pl.library.groupAddItem}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder={pl.library.groupPickerSearch} />
          <CommandList className="max-h-[240px]">
            <CommandEmpty>
              {rows.length === 0 ? pl.library.groupPickerNoItems : pl.library.groupPickerEmpty}
            </CommandEmpty>

            {rows.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.name} ${item.description} ${item.categoryName}`}
                onSelect={() => {
                  onPick(libraryItemToSnapshot(item));
                  setOpen(false);
                }}
                className="flex items-center gap-3"
              >
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="tabular text-ink-soft shrink-0 text-xs">
                  {item.unitPriceCents === null
                    ? pl.editor.individualPrice
                    : formatMoney(item.unitPriceCents)}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
