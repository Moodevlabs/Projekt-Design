import { useMemo, useState } from 'react';
import { Plus, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LibraryPickerSheet } from '@/features/library/components/LibraryPickerSheet';
import { useUpdateLibraryItem } from '@/data/queries/useLibrary';
import type { LibraryItem } from '@/data/repos/library.repo';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

type CategoryItemsListProps = {
  categoryId: string;
  categoryName: string;
  /** Usługi przypisane do tej grupy. */
  items: LibraryItem[];
  /** Cała biblioteka — z niej powstają kandydatki do dopięcia. */
  all: LibraryItem[];
};

/**
 * Zawartość grupy: które usługi do niej należą i jak to zmienić (T-120).
 *
 * Grupa jest **słownikiem**, nie snapshotem: usługa wskazuje grupę przez
 * `library_items.category_id`, więc dopięcie i odpięcie to `update` na
 * usłudze, a nie kopiowanie jej do grupy. Stąd dwie konsekwencje, które
 * widać w UI:
 *  - usługa należy do JEDNEJ grupy, więc dodanie jej tutaj **przenosi** ją
 *    z poprzedniej — picker mówi o tym wprost przy każdym kandydacie;
 *  - „Odepnij" nie kasuje usługi, tylko przestawia ją na „Bez grupy”.
 *
 * ⚠️ Repozytorium przy każdej zmianie usługi zdejmuje flagę „Przykładowa"
 * (`updateLibraryItem` ustawia `is_sample = false`). Dopięcie do grupy też
 * jest edycją, więc przykładowa usługa przestaje się liczyć do „Usuń
 * pozostałe przykładowe" — to reguła z koncepcji §5, nie skutek uboczny.
 */
export function CategoryItemsList({
  categoryId,
  categoryName,
  items,
  all,
}: CategoryItemsListProps) {
  const update = useUpdateLibraryItem();

  const assign = (item: LibraryItem, next: string | null) => {
    update.mutate(
      { id: item.id, patch: { categoryId: next } },
      {
        onSuccess: () =>
          toast.success(
            next === null
              ? pl.library.categoryItemUnassigned(item.name)
              : pl.library.categoryItemAssigned(item.name, categoryName),
          ),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="border-hair mt-3 flex flex-col gap-2 border-t pt-3">
      {items.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.library.categoryItemsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className="text-ink min-w-0 flex-1 truncate">{item.name}</span>
              <span className="tabular text-ink-soft shrink-0 text-xs">
                {item.unitPriceCents === null
                  ? pl.editor.individualPrice
                  : formatMoney(item.unitPriceCents)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={update.isPending}
                aria-label={pl.library.categoryRemoveItem(item.name)}
                onClick={() => assign(item, null)}
              >
                <Unlink aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CategoryItemPicker
        categoryId={categoryId}
        categoryName={categoryName}
        all={all}
        disabled={update.isPending}
        onPick={(item) => assign(item, categoryId)}
      />

      <p className="text-ink-soft text-xs">{pl.library.categoryItemsHint}</p>
    </div>
  );
}

/**
 * „Dodaj usługę" na wierszu grupy. Kandydatki to wszystko, czego w tej grupie
 * jeszcze nie ma — razem z usługami z INNYCH grup, bo przeniesienie jest
 * najczęstszym powodem, dla którego ktoś tu zagląda. Przy takim kandydacie
 * stoi nazwa jego obecnej grupy, żeby przeniesienie nie było niespodzianką.
 *
 * Od T-123 to ten sam panel z prawej co „Dodaj usługi" w wycenie, a nie
 * własny popover — jeden gest, jeden wygląd.
 */
function CategoryItemPicker({
  categoryId,
  categoryName,
  all,
  disabled,
  onPick,
}: {
  categoryId: string;
  categoryName: string;
  all: LibraryItem[];
  disabled: boolean;
  onPick: (item: LibraryItem) => void;
}) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      all
        .filter((item) => item.categoryId !== categoryId)
        .map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.description || undefined,
          meta: item.categoryName ? pl.library.categoryPickerFrom(item.categoryName) : undefined,
        })),
    [all, categoryId],
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={pl.library.categoryAddItemFor(categoryName)}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        {pl.library.categoryAddItem}
      </Button>

      <LibraryPickerSheet
        open={open}
        onOpenChange={setOpen}
        title={pl.library.categoryAddItemFor(categoryName)}
        description={pl.library.categoryPickerHint}
        rows={rows}
        emptyLabel={pl.library.categoryPickerNoItems}
        noMatchLabel={pl.library.categoryPickerEmpty}
        addLabel={(name) => pl.library.categoryPickerAddLabel(name)}
        onAdd={(id) => {
          const item = all.find((candidate) => candidate.id === id);
          if (item) onPick(item);
        }}
      />
    </>
  );
}
