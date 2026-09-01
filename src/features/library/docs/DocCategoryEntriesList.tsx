import { useMemo, useState } from 'react';
import { Plus, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LibraryPickerSheet } from '@/features/library/components/LibraryPickerSheet';
import { useSetDocEntryCategory } from '@/data/queries/useLibraryDocGroups';
import type { DocLibraryRow } from '@/data/repos/library-docs.repo';
import type { DocLibraryKind } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

type DocCategoryEntriesListProps<K extends DocLibraryKind> = {
  kind: K;
  categoryId: string;
  categoryName: string;
  /** Wpisy przypisane do tej grupy. */
  entries: DocLibraryRow<K>[];
  /** Wszystkie wpisy rodzaju — z nich powstają kandydaci do dopięcia. */
  all: DocLibraryRow<K>[];
  /** Nazwy grup po `id` — picker mówi, skąd kandydat zostanie przeniesiony. */
  categoryNames: ReadonlyMap<string, string>;
};

/**
 * Zawartość grupy dokumentu: które wpisy do niej należą i jak to zmienić (T-121).
 *
 * Bliźniak `CategoryItemsList` z biblioteki usług i ta sama zasada: grupa jest
 * **słownikiem**, więc dopięcie i odpięcie to `update` na wpisie
 * (`library_doc_entries.category_id`), a nie kopiowanie go do grupy. Wpis
 * należy do JEDNEJ grupy, więc dodanie tutaj **przenosi** go z poprzedniej.
 *
 * ⚠️ W odróżnieniu od usług przypisanie **nie zdejmuje** flagi „Przykładowy" —
 * uzasadnienie stoi przy `setDocEntryCategory` w repozytorium.
 */
export function DocCategoryEntriesList<K extends DocLibraryKind>({
  kind,
  categoryId,
  categoryName,
  entries,
  all,
  categoryNames,
}: DocCategoryEntriesListProps<K>) {
  const assign = useSetDocEntryCategory(kind);

  const move = (row: DocLibraryRow<K>, next: string | null) => {
    assign.mutate(
      { entryId: row.id, categoryId: next },
      {
        onSuccess: () =>
          toast.success(
            next === null
              ? pl.library.docs.groups.unassigned(row.name)
              : pl.library.docs.groups.assigned(row.name, categoryName),
          ),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="border-hair mt-3 flex flex-col gap-2 border-t pt-3">
      {entries.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.library.docs.groups.entriesEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((row) => (
            <li key={row.id} className="flex items-center gap-2 text-sm">
              <span className="text-ink min-w-0 flex-1 truncate">{row.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={assign.isPending}
                aria-label={pl.library.docs.groups.removeEntry(row.name)}
                onClick={() => move(row, null)}
              >
                <Unlink aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <EntryPicker
        categoryId={categoryId}
        categoryName={categoryName}
        all={all}
        categoryNames={categoryNames}
        disabled={assign.isPending}
        onPick={(row) => move(row, categoryId)}
      />

      <p className="text-ink-soft text-xs">{pl.library.docs.groups.entriesHint}</p>
    </div>
  );
}

/**
 * „Dodaj wpis" na wierszu grupy. Kandydaci to wszystko z tego rodzaju, czego
 * w tej grupie jeszcze nie ma — razem z wpisami z INNYCH grup, bo
 * przeniesienie jest najczęstszym powodem, dla którego ktoś tu zagląda.
 *
 * Od T-123 wspólny `LibraryPickerSheet`, ten sam co przy usługach.
 */
function EntryPicker<K extends DocLibraryKind>({
  categoryId,
  categoryName,
  all,
  categoryNames,
  disabled,
  onPick,
}: {
  categoryId: string;
  categoryName: string;
  all: DocLibraryRow<K>[];
  categoryNames: ReadonlyMap<string, string>;
  disabled: boolean;
  onPick: (row: DocLibraryRow<K>) => void;
}) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      all
        .filter((row) => row.categoryId !== categoryId)
        .map((row) => {
          const from = row.categoryId ? categoryNames.get(row.categoryId) : null;
          return {
            id: row.id,
            title: row.name,
            meta: from ? pl.library.docs.groups.pickerFrom(from) : undefined,
          };
        }),
    [all, categoryId, categoryNames],
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={pl.library.docs.groups.addEntryFor(categoryName)}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        {pl.library.docs.groups.addEntry}
      </Button>

      <LibraryPickerSheet
        open={open}
        onOpenChange={setOpen}
        title={pl.library.docs.groups.addEntryFor(categoryName)}
        description={pl.library.docs.groups.pickerHint}
        rows={rows}
        emptyLabel={pl.library.docs.groups.pickerNoEntries}
        noMatchLabel={pl.library.docs.groups.pickerEmpty}
        addLabel={(name) => pl.library.docs.groups.pickerAddLabel(name)}
        onAdd={(id) => {
          const row = all.find((candidate) => candidate.id === id);
          if (row) onPick(row);
        }}
      />
    </>
  );
}
