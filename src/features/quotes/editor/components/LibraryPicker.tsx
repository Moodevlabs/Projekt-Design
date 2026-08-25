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
import { Button } from '@/components/ui/button';
import { AddLink } from './AddLink';
import { CategoryPills } from './CategoryPills';
import { PickerRow } from './PickerRow';
import { useLibraryGroups, useLibraryItems } from '@/data/queries/useLibrary';
import { useEditorStore } from '../editor.store';
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
 *
 * **Popover NIE zamyka się po dodaniu pozycji (T-70).** Wycena „Projekt
 * kompleksowy" to kilkanaście usług; zamykanie po każdej zamieniało budowanie
 * oferty w kilkanaście cykli otwórz–szukaj–kliknij. Dodane pozycje zostają na
 * liście z licznikiem, bo tę samą usługę czasem dodaje się dwa razy — i to
 * jest poprawna wycena, a nie pomyłka do zablokowania.
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
  const [category, setCategory] = useState<string | null>(null);
  /** Ile razy dodano daną pozycję w tej sesji pickera. */
  const [added, setAdded] = useState<Record<string, number>>({});

  // Biblioteka jest mała i współdzieli cache TanStack Query z resztą aplikacji,
  // więc kilkanaście pickerów na stronie pobiera ją raz.
  const items = useLibraryItems();
  const groups = useLibraryGroups();

  /*
   * Pomieszczenia bierzemy ze store'u, a nie z propsów, i to jest decyzja
   * wydajnościowa: `SectionBlock` jest zmemoizowany, a przekazanie tu nowego
   * callbacka przy każdym renderze rodzica przerysowywałoby wszystkie wiersze
   * przy każdej literze (pułapka z T-39). Subskrypcja siedzi w pickerze, więc
   * zmiana pomieszczeń rusza wyłącznie jego.
   */
  const roomCount = useEditorStore((state) => state.body?.rooms.length ?? 0);
  const addRoom = useEditorStore((state) => state.addRoom);

  const grouped = useMemo(
    () => byCategory(items.data ?? [], priorityCategory),
    [items.data, priorityCategory],
  );

  const categories = useMemo(() => grouped.map(([name]) => name), [grouped]);
  const visible = category === null ? grouped : grouped.filter(([name]) => name === category);

  const dodanychRazem = Object.values(added).reduce((sum, count) => sum + count, 0);

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
      wstaw(libraryItem.id, wyceniona);
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

    wstaw(libraryItem.id, przeliczona);
    toast.info(
      pricing.pricingBasis === 'time'
        ? pl.editor.libraryConvertedToTime
        : pl.editor.libraryConvertedToAmount,
    );
  };

  const wstaw = (libraryItemId: string, item: Item) => {
    onPickItem(item);
    setAdded((current) => ({ ...current, [libraryItemId]: (current[libraryItemId] ?? 0) + 1 }));
  };

  /**
   * Zamknięcie pickera — **jedyna droga wyjścia**, także dla „Gotowe".
   *
   * Licznik i filtr dotyczą jednej sesji dobierania; zostawione mówiłyby przy
   * następnym otwarciu o dodaniach, których nikt już nie pamięta. Reset
   * w samym `onOpenChange` nie wystarczał: `setOpen(false)` wołany z przycisku
   * omija handler Radiksa i zostawiał stan poprzedniej sesji.
   */
  const close = () => {
    setOpen(false);
    setAdded({});
    setCategory(null);
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
    // Zestaw to komplet pozycji — po nim nie ma czego dobierać.
    close();
  };

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      {/*
        Bez własnego `onClick` — otwieraniem steruje wyłącznie `PopoverTrigger`.
        Własny handler ustawiający `true` wygrywałby z toggle'em Radiksa
        (`Slot` woła oba, nasz jako drugi), więc kliknięcie w otwarty trigger
        nigdy by popovera nie zamknęło.
      */}
      <PopoverTrigger asChild>
        <AddLink icon={Library}>{label ?? pl.editor.fromLibrary}</AddLink>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[340px] p-0">
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

          {tab === 'items' && categories.length > 1 ? (
            <CategoryPills categories={categories} value={category} onChange={setCategory} />
          ) : null}

          <CommandList className="max-h-[280px]">
            <CommandEmpty>{pl.editor.pickerEmpty}</CommandEmpty>

            {tab === 'items'
              ? visible.map(([categoryName, categoryItems]) => (
                  <CommandGroup key={categoryName} heading={categoryName}>
                    {categoryItems.map((item) => (
                      <PickerRow
                        key={item.id}
                        item={item}
                        addedCount={added[item.id] ?? 0}
                        roomCount={roomCount}
                        onAddRooms={() => addRoom()}
                        onPick={() => pickItem(item)}
                      />
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

        {/*
          Stopka pojawia się dopiero po pierwszym dodaniu. Pusta mówiłaby
          „Dodano 0 pozycji" — informacja o tym, że nic się nie stało.
        */}
        {dodanychRazem > 0 ? (
          <div className="border-hair flex items-center justify-between gap-2 border-t px-3 py-2">
            <span className="text-ink-soft text-xs">
              {pl.editor.pickerAddedSummary(dodanychRazem)}
            </span>
            <Button type="button" size="sm" onClick={close}>
              {pl.editor.pickerDone}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
