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
import { toast } from 'sonner';
import {
  convertItemUnits,
  newGroup,
  type Group,
  type Item,
  type PricingContext,
} from '@/domain/quote';
import { libraryItemToQuoteItem, librarySnapshotToQuoteItem } from '@/domain/library/schema';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

export interface LibraryPickerProps {
  /** Kategoria wypychana na górę listy — nazwa grupy albo tytuł sekcji. */
  priorityCategory?: string;
  onPickItem: (item: Item) => void;
  /**
   * Tryb wyceny, do której wstawiamy (F2.2).
   *
   * Wpis biblioteczny niesie własną jednostkę (`pricingBasis`), a liczba bez
   * jednostki kłamie: „45" z wyceny godzinowej wstawione do kwotowej to nie
   * 45 groszy, tylko 45 minut pracy. Bez tego kontekstu picker nie ma jak
   * ich rozróżnić.
   */
  pricing: PricingContext;
  /** Gdy podane, popover dostaje drugą zakładkę z zestawami. */
  onPickGroup?: (group: Group) => void;
  /** Własny tekst linku — domyślnie „Z biblioteki”. */
  label?: string;
}

/**
 * Wybór z biblioteki. `Command` daje szukajkę, nawigację strzałkami i Enter
 * bez dopisywania własnej obsługi klawiatury.
 */
export function LibraryPicker({
  priorityCategory,
  onPickItem,
  onPickGroup,
  label,
  pricing,
}: LibraryPickerProps) {
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

  /**
   * Wstawienie pozycji z biblioteki.
   *
   * Gdy jednostka wpisu nie zgadza się z trybem wyceny, **przeliczamy** po
   * stawce dokumentu i mówimy o tym wprost. Bez stawki nie ma kursu wymiany,
   * więc odmawiamy — wstawienie liczby „jak leci" wpisałoby do oferty 45 groszy
   * tam, gdzie ktoś policzył 45 minut pracy, i nikt by tego nie zauważył.
   */
  const pickItem = (libraryItem: LibraryItem) => {
    const wyceniona = libraryItemToQuoteItem(libraryItem);

    if (libraryItem.pricingBasis === pricing.pricingBasis) {
      onPickItem(wyceniona);
      setOpen(false);
      return;
    }

    const przeliczona = convertItemUnits(
      wyceniona,
      libraryItem.pricingBasis,
      pricing.pricingBasis,
      pricing.hourlyRateCents,
    );

    if (!przeliczona) {
      toast.error(pl.editor.libraryBasisMismatch);
      return;
    }

    onPickItem(przeliczona);
    toast.info(
      pricing.pricingBasis === 'time'
        ? pl.editor.libraryConvertedToTime
        : pl.editor.libraryConvertedToAmount,
    );
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
      {/*
        Bez własnego `onClick` — otwieraniem steruje wyłącznie `PopoverTrigger`.
        Własny handler ustawiający `true` wygrywałby z toggle'em Radiksa
        (`Slot` woła oba, nasz jako drugi), więc kliknięcie w otwarty trigger
        nigdy by popovera nie zamknęło.
      */}
      <PopoverTrigger asChild>
        <AddLink icon={Library}>{label ?? pl.editor.fromLibrary}</AddLink>
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
                          {item.unitPriceCents === null
                            ? pl.editor.individualPrice
                            : formatMoney(item.unitPriceCents)}
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
