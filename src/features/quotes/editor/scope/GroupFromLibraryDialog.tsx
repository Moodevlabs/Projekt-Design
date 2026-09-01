import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAllLibraryItems, useLibraryGroups } from '@/data/queries/useLibrary';
import { useLibraryCategoryList } from '@/data/queries/useLibraryCategories';
import type { LibraryItem } from '@/data/repos/library.repo';
import {
  categoryLabel,
  librarySnapshotToQuoteItem,
  type LibraryCategory,
} from '@/domain/library/schema';
import { categorySwatch } from '@/features/library/categories/swatches';
import { newGroup, type Group, type PricingContext } from '@/domain/quote';
import { useInsertFromLibrary } from './useInsertFromLibrary';
import { useGroupPicker, type GroupPickerTab } from './group-picker.store';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface GroupFromLibraryDialogProps {
  pricing: PricingContext;
  onInsertGroup: (sectionId: string, group: Group) => void;
}

/**
 * „Dodaj grupę → z biblioteki" (T-120).
 *
 * Dwie półki, bo w bibliotece są dwa byty i oba są tu na miejscu:
 *  - **Grupa** (`library_categories`) wnosi usługi, które do niej należą
 *    — czyli żywy stan biblioteki, rozwiązany w chwili wstawienia;
 *  - **Zestaw** (`library_groups`) wnosi zapisany snapshot pozycji.
 *
 * Grupa idzie przez dwa kroki (wybór grupy → co z niej wziąć), bo przy
 * dwudziestu usługach wstawianie wszystkiego na ślepo znaczyłoby kasowanie
 * połowy z nich ręcznie. Zestaw wstawia się jednym kliknięciem: jego sensem
 * jest właśnie to, że ktoś ten wybór zrobił wcześniej.
 */
export function GroupFromLibraryDialog({ pricing, onInsertGroup }: GroupFromLibraryDialogProps) {
  const open = useGroupPicker((state) => state.open);
  const sectionId = useGroupPicker((state) => state.sectionId);
  const tab = useGroupPicker((state) => state.tab);
  const setTab = useGroupPicker((state) => state.setTab);
  const close = useGroupPicker((state) => state.close);

  const categories = useLibraryCategoryList();
  const items = useAllLibraryItems();
  const sets = useLibraryGroups();
  const toQuoteItem = useInsertFromLibrary(pricing);

  const [picked, setPicked] = useState<LibraryCategory | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());

  // Zamknięcie kończy sesję wyboru — inaczej kolejne otwarcie zaczynałoby się
  // w środku poprzedniej grupy, z jej odznaczeniami.
  useEffect(() => {
    if (!open) {
      setPicked(null);
      setTaken(new Set());
    }
  }, [open]);

  const inCategory = useMemo(
    () => (items.data ?? []).filter((item) => item.categoryId === picked?.id),
    [items.data, picked],
  );

  const pick = (category: LibraryCategory) => {
    setPicked(category);
    setTaken(
      new Set(
        (items.data ?? []).filter((item) => item.categoryId === category.id).map((item) => item.id),
      ),
    );
  };

  const insertCategory = () => {
    if (!sectionId || !picked) return;

    // Konwersja jednostek MUSI iść przez `useInsertFromLibrary`: wpis
    // godzinowy wstawiony wprost do wyceny kwotowej zamieniłby 45 minut
    // pracy w 45 groszy. Pozycje, których nie da się przeliczyć, hook
    // odrzuca z komunikatem — wstawiamy grupę bez nich, zamiast udawać.
    const converted = inCategory
      .filter((item) => taken.has(item.id))
      .map((item) => toQuoteItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    onInsertGroup(
      sectionId,
      newGroup({ name: picked.name, categoryId: picked.id, items: converted }),
    );
    toast.success(
      converted.length === 0 ? pl.editor.groupInsertedEmpty : pl.editor.groupInserted(picked.name),
    );
    close();
  };

  const insertSet = (id: string) => {
    if (!sectionId) return;
    const source = sets.data?.find((candidate) => candidate.id === id);
    if (!source) return;

    onInsertGroup(
      sectionId,
      newGroup({
        name: source.name,
        items: source.items.map((snapshot) => librarySnapshotToQuoteItem(snapshot)),
      }),
    );
    toast.success(pl.editor.groupInserted(source.name));
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-hair border-b px-6 pt-6 pb-4">
          <DialogTitle>{pl.editor.groupPickerTitle}</DialogTitle>
          <DialogDescription>{pl.editor.groupPickerHint}</DialogDescription>
        </DialogHeader>

        {picked === null ? (
          <div className="border-hair flex gap-1 border-b px-6 py-3" role="tablist">
            {(['categories', 'sets'] as const).map((value) => (
              <TabButton key={value} value={value} active={tab} onSelect={setTab} />
            ))}
          </div>
        ) : (
          <div className="border-hair border-b px-6 py-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
              <ArrowLeft className="size-3.5" aria-hidden />
              {pl.editor.groupPickerBack}
            </Button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {picked !== null ? (
            <CategoryItems
              items={inCategory}
              taken={taken}
              onToggle={(id) =>
                setTaken((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />
          ) : tab === 'categories' ? (
            <CategoryList
              categories={categories.data ?? []}
              items={items.data ?? []}
              onPick={pick}
            />
          ) : (sets.data ?? []).length === 0 ? (
            <p className="text-ink-soft px-3 py-8 text-center text-sm">
              {pl.editor.groupPickerNoSets}
            </p>
          ) : (
            <ul>
              {(sets.data ?? []).map((set) => (
                <li
                  key={set.id}
                  className="border-hair flex items-center gap-3 border-b py-2.5"
                  data-testid="group-picker-set"
                >
                  <span className="text-ink min-w-0 flex-1 truncate text-sm">{set.name}</span>
                  <span className="text-ink-soft tabular shrink-0 text-xs">
                    {pl.editor.scopeSetItems(set.items.length)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 px-2.5"
                    aria-label={pl.editor.groupPickerPick(set.name)}
                    onClick={() => insertSet(set.id)}
                  >
                    {pl.editor.groupPickerInsert}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {picked !== null ? (
          <div className="border-hair flex items-center justify-between gap-3 border-t px-6 py-3">
            <span className="text-ink-soft text-xs">{pl.editor.groupPickerCount(taken.size)}</span>
            <Button type="button" onClick={insertCategory}>
              {pl.editor.groupPickerInsert}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  value,
  active,
  onSelect,
}: {
  value: GroupPickerTab;
  active: GroupPickerTab;
  onSelect: (tab: GroupPickerTab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active === value}
      onClick={() => onSelect(value)}
      className={cn(
        'rounded-[var(--radius-pill)] px-3 py-1 text-xs transition-colors',
        active === value
          ? 'bg-primary text-primary-foreground font-medium'
          : 'text-ink-soft hover:text-ink',
      )}
    >
      {value === 'categories' ? pl.editor.groupPickerTabCategories : pl.editor.groupPickerTabSets}
    </button>
  );
}

/** Krok 1: która grupa. Licznik usług bierze się z biblioteki, nie ze słownika. */
function CategoryList({
  categories,
  items,
  onPick,
}: {
  categories: LibraryCategory[];
  items: LibraryItem[];
  onPick: (category: LibraryCategory) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="text-ink-soft px-3 py-8 text-center text-sm">
        {pl.editor.groupPickerNoCategories}
      </p>
    );
  }

  return (
    <ul>
      {categories.map((category) => {
        const count = items.filter((item) => item.categoryId === category.id).length;
        return (
          <li
            key={category.id}
            className="border-hair border-b"
            data-testid="group-picker-category"
          >
            <button
              type="button"
              aria-label={pl.editor.groupPickerPick(category.name)}
              onClick={() => onPick(category)}
              className="hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-3 rounded-[var(--radius-control)] py-2.5 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <span
                aria-hidden
                className="border-hair size-2.5 shrink-0 rounded-full border"
                style={{ backgroundColor: categorySwatch(category.color) }}
              />
              <span className="text-ink min-w-0 flex-1 truncate text-sm">
                {categoryLabel(category)}
              </span>
              <span className="text-ink-soft tabular shrink-0 text-xs">
                {pl.editor.groupPickerCount(count)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Krok 2: co z tej grupy wziąć. Domyślnie wszystko — odznaczanie to wyjątek. */
function CategoryItems({
  items,
  taken,
  onToggle,
}: {
  items: LibraryItem[];
  taken: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-ink-soft px-3 py-8 text-center text-sm">
        {pl.editor.groupPickerEmptyCategory}
      </p>
    );
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="border-hair flex items-center gap-3 border-b py-2">
          <Checkbox
            id={`group-picker-${item.id}`}
            checked={taken.has(item.id)}
            onCheckedChange={() => onToggle(item.id)}
          />
          <label
            htmlFor={`group-picker-${item.id}`}
            className="text-ink min-w-0 flex-1 cursor-pointer truncate text-sm"
          >
            {item.name}
          </label>
        </li>
      ))}
    </ul>
  );
}
