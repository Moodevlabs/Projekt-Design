import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '../components/MoneyInput';
import { KindToggle } from '../components/KindToggle';
import { draftSignature, itemSignature, toItemDraft, type ItemDraft } from './item-draft';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

type LibraryItemCardProps = {
  item: LibraryItem;
  /** `id` wspólnej listy podpowiedzi kategorii (jedna na całą zakładkę). */
  categoryListId: string;
  onSave: (draft: ItemDraft) => void;
  onDelete: () => void;
  saving?: boolean;
};

/**
 * Karta pozycji bibliotecznej z edycją w miejscu.
 *
 * Szkic żyje lokalnie, a zapis jest jawny (przycisk pojawia się dopiero przy
 * zmianach) — inaczej każde naciśnięcie klawisza byłoby osobnym zapisem i osobną
 * szansą na pytanie o kaskadę do otwartej wyceny.
 */
export function LibraryItemCard({
  item,
  categoryListId,
  onSave,
  onDelete,
  saving = false,
}: LibraryItemCardProps) {
  const [draft, setDraft] = useState<ItemDraft>(() => toItemDraft(item));
  // Ostatni stan pozycji, jaki widziała karta — po nim poznajemy, czy szkic
  // jest „czysty” i wolno go nadpisać świeżymi danymi z serwera.
  const seen = useRef(itemSignature(item));
  const signature = itemSignature(item);

  useEffect(() => {
    setDraft((previous) =>
      draftSignature(previous) === seen.current ? toItemDraft(item) : previous,
    );
    seen.current = signature;
  }, [item, signature]);

  const dirty = draftSignature(draft) !== signature;
  const patch = (fields: Partial<ItemDraft>) =>
    setDraft((previous) => ({ ...previous, ...fields }));
  const label = item.name || pl.library.newItemName;

  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <header className="flex items-start justify-between gap-2">
        <KindToggle
          value={draft.kind}
          onChange={(kind) => patch({ kind })}
          label={`${pl.library.itemKindLabel}: ${label}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={pl.library.deleteItem(label)}
          onClick={onDelete}
        >
          <Trash2 aria-hidden />
        </Button>
      </header>

      <Input
        value={draft.name}
        aria-label={`${pl.library.itemNameLabel}: ${label}`}
        placeholder={pl.library.newItemName}
        onChange={(event) => patch({ name: event.target.value })}
        className="text-ink h-8 border-transparent px-2 text-sm font-semibold shadow-none"
      />

      <Textarea
        value={draft.description}
        aria-label={`${pl.library.itemDescriptionLabel}: ${label}`}
        placeholder={pl.library.itemDescriptionPlaceholder}
        onChange={(event) => patch({ description: event.target.value })}
        className="text-ink-soft min-h-10 border-transparent px-2 py-1 text-sm shadow-none"
      />

      <div className="flex items-center gap-2">
        <Input
          value={draft.category}
          list={categoryListId}
          aria-label={`${pl.library.itemCategoryLabel}: ${label}`}
          placeholder={pl.library.category}
          onChange={(event) => patch({ category: event.target.value })}
          className="text-ink-soft h-8 flex-1 px-2 text-xs"
        />
        <MoneyInput
          cents={draft.unitPriceCents}
          onChange={(unitPriceCents) => patch({ unitPriceCents })}
          discount={draft.kind === 'discount'}
          ariaLabel={`${pl.library.itemPriceLabel}: ${label}`}
          className="w-36"
        />
      </div>

      {dirty ? (
        <div className="border-hair flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={pl.library.cancelItem(label)}
            onClick={() => setDraft(toItemDraft(item))}
          >
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            aria-label={pl.library.saveItem(label)}
            onClick={() => onSave(draft)}
          >
            {pl.common.save}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
