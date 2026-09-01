import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LibraryPickerSheet } from '@/features/library/components/LibraryPickerSheet';
import { docEntrySummary } from './doc-entry-summary';
import { useDocLibraryEntries } from '@/data/queries/useLibraryDocs';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import type { DocLibrarySet } from '@/domain/library/doc-groups';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

type DocSetCardProps<K extends DocLibraryKind> = {
  kind: K;
  set: DocLibrarySet<K>;
  onRename: (name: string) => void;
  /** Zawartość zestawu zapisuje się od razu, bez przycisku „Zapisz". */
  onItemsChange: (items: DocLibraryPayloadByKind[K][]) => void;
  onDelete: () => void;
  saving?: boolean;
};

/**
 * Karta zestawu dokumentu (T-121): nazwa (edycja w miejscu), liczba wpisów
 * i rozwijana zawartość.
 *
 * Bliźniak `LibraryGroupCard` z usług, bez sumy netto — etap terminu nie ma
 * ceny, a cennik dodatkowy ma widełki, nie kwotę. Doklejanie tu „sumy" byłoby
 * liczbą bez znaczenia.
 */
export function DocSetCard<K extends DocLibraryKind>({
  kind,
  set,
  onRename,
  onItemsChange,
  onDelete,
  saving = false,
}: DocSetCardProps<K>) {
  const [name, setName] = useState(set.name);
  const [open, setOpen] = useState(false);
  const seen = useRef(set.name);

  useEffect(() => {
    // Świeże dane wpuszczamy tylko wtedy, gdy nie kasują niezapisanej edycji.
    setName((previous) => (previous === seen.current ? set.name : previous));
    seen.current = set.name;
  }, [set.name]);

  const dirty = name !== set.name;
  const label = set.name || pl.library.docs.sets.newName;
  const listId = `doc-set-items-${set.id}`;

  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <header className="flex items-start justify-between gap-2">
        <Input
          value={name}
          aria-label={`${pl.library.docs.sets.nameLabel}: ${label}`}
          placeholder={pl.library.docs.sets.newName}
          onChange={(event) => setName(event.target.value)}
          className="text-ink h-8 border-transparent px-2 text-sm font-semibold shadow-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={pl.library.docs.sets.delete(label)}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </header>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={
          open
            ? pl.library.docs.sets.hideItems(label)
            : pl.library.docs.sets.showItems(label)
        }
        onClick={() => setOpen((previous) => !previous)}
        className="text-ink-soft hover:text-ink focus-visible:ring-ring flex items-center gap-1 self-start rounded-[var(--radius-control)] text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        {pl.library.docs.sets.itemsCount(set.items.length)}
      </button>

      {open ? (
        <div id={listId} className="border-hair flex flex-col gap-2 border-t pt-3">
          {set.items.length === 0 ? (
            <p className="text-ink-soft text-sm">{pl.library.docs.sets.itemsEmpty}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {set.items.map((item, index) => (
                <li key={`${item.name}-${index}`} className="flex items-center gap-2 text-sm">
                  <span className="text-ink min-w-0 flex-1 truncate">{item.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={pl.library.docs.sets.removeItem(item.name)}
                    onClick={() => onItemsChange(set.items.filter((_, at) => at !== index))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <SetItemPicker
            kind={kind}
            setName={label}
            disabled={saving}
            onPick={(payload) => onItemsChange([...set.items, payload])}
          />

          <p className="text-ink-soft text-xs">{pl.library.docs.sets.itemsHint}</p>
        </div>
      ) : null}

      {dirty ? (
        <div className="border-hair flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={pl.library.docs.sets.cancel(label)}
            onClick={() => setName(set.name)}
          >
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            aria-label={pl.library.docs.sets.save(label)}
            onClick={() => onRename(name)}
          >
            {pl.common.save}
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/**
 * „Dodaj wpis" na karcie zestawu. Wkłada **kopię** payloadu, nie klucz obcy —
 * zestaw ma zostać taki, jaki był w chwili złożenia, nawet gdy wpis źródłowy
 * później się zmieni. Ta sama zasada co przy zestawach usług.
 *
 * Od T-123 wspólny `LibraryPickerSheet`: składanie zestawu to dobieranie
 * kilku wpisów, a popover zamykał się po każdym.
 */
function SetItemPicker<K extends DocLibraryKind>({
  kind,
  setName,
  disabled,
  onPick,
}: {
  kind: K;
  setName: string;
  disabled: boolean;
  onPick: (payload: DocLibraryPayloadByKind[K]) => void;
}) {
  const [open, setOpen] = useState(false);
  const library = useDocLibraryEntries(kind);

  const rows = useMemo(
    () =>
      library.entries.map((entry) => ({
        id: entry.id,
        title: entry.name,
        subtitle: docEntrySummary(kind, entry.payload) || undefined,
      })),
    [library.entries, kind],
  );

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={pl.library.docs.sets.addItemFor(setName)}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden />
        {pl.library.docs.sets.addItem}
      </Button>

      <LibraryPickerSheet
        open={open}
        onOpenChange={setOpen}
        title={pl.library.docs.sets.addItemFor(setName)}
        description={pl.library.docs.sets.pickerHint}
        rows={rows}
        emptyLabel={pl.library.docs.sets.pickerNoEntries}
        noMatchLabel={pl.library.docs.sets.pickerEmpty}
        addLabel={(name) => pl.library.docs.sets.pickerAddLabel(name)}
        onAdd={(id) => {
          const entry = library.entries.find((candidate) => candidate.id === id);
          if (entry) onPick(entry.payload);
        }}
      />
    </>
  );
}
