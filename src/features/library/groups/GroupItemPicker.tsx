import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LibraryPickerSheet } from '@/features/library/components/LibraryPickerSheet';
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
 *
 * Od T-123 otwiera wspólny `LibraryPickerSheet` zamiast popovera na 280 px.
 * Powód jest prosty: składanie zestawu to dobieranie KILKU pozycji, a wąskie
 * okienko zamykało się po każdej i kazało zaczynać od nowa.
 */
export function GroupItemPicker({ groupName, onPick }: GroupItemPickerProps) {
  const [open, setOpen] = useState(false);
  const items = useLibraryItems();

  const rows = useMemo(
    () =>
      (items.data ?? []).map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: item.description || undefined,
        meta:
          item.unitPriceCents === null
            ? pl.editor.individualPrice
            : formatMoney(item.unitPriceCents),
      })),
    [items.data],
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={pl.library.groupAddItemFor(groupName)}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        {pl.library.groupAddItem}
      </Button>

      <LibraryPickerSheet
        open={open}
        onOpenChange={setOpen}
        title={pl.library.groupAddItemFor(groupName)}
        description={pl.library.groupPickerHint}
        rows={rows}
        emptyLabel={pl.library.groupPickerNoItems}
        noMatchLabel={pl.library.groupPickerEmpty}
        addLabel={(name) => pl.library.groupPickerAddLabel(name)}
        onAdd={(id) => {
          const item = (items.data ?? []).find((candidate) => candidate.id === id);
          if (item) onPick(libraryItemToSnapshot(item));
        }}
      />
    </>
  );
}
