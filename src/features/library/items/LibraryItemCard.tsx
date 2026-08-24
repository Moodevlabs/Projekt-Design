import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '../components/MoneyInput';
import { KindToggle } from '../components/KindToggle';
import { PricingEditor } from './PricingEditor';
import { PlaceholderMenu } from '@/components/shared';
import { VariantField } from './VariantField';
import { draftSignature, itemSignature, toItemDraft, type ItemDraft } from './item-draft';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { PricingRule } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Etykieta trybu na zwiniętym przełączniku — widać sposób wyceny bez rozwijania. */
const MODE_LABELS: Record<PricingRule['mode'], string> = {
  flat: pl.library.pricingFlat,
  per_room: pl.library.pricingPerRoom,
  per_frame: pl.library.pricingPerFrame,
};

type LibraryItemCardProps = {
  item: LibraryItem;
  /** Cala biblioteka — do wyboru grupy wariantow (F1.4). */
  allItems: LibraryItem[];
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
  allItems,
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

  // Reguła cenowa jest zwinięta domyślnie: większość pozycji zostaje przy
  // stałej cenie, a rozwinięta macierz stawek zdominowałaby kartę.
  const [pricingOpen, setPricingOpen] = useState(item.pricing.mode !== 'flat');
  const pricingId = `library-item-pricing-${item.id}`;

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

      {/*
        Placeholdery (F4.2) autoruje sie WLASNIE TUTAJ: opis biblioteczny
        kaskaduje do wycen, wiec zdanie „Widoki scian dla: {rooms}." napisane
        raz obsluguje kazda przyszla oferte.
      */}
      <div className="flex items-start gap-1">
        <Textarea
          value={draft.description}
          aria-label={`${pl.library.itemDescriptionLabel}: ${label}`}
          placeholder={pl.library.itemDescriptionPlaceholder}
          onChange={(event) => patch({ description: event.target.value })}
          className="text-ink-soft min-h-10 border-transparent px-2 py-1 text-sm shadow-none"
        />
        <PlaceholderMenu
          value={draft.description}
          onInsert={(description) => patch({ description })}
          className="mt-1"
        />
      </div>

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
          // Inline-edit ceny operuje liczbami; „wycena indywidualna" ustawia
          // się na pełnej stronie usługi (T-61), nie w szybkiej poprawce.
          cents={draft.unitPriceCents ?? 0}
          onChange={(unitPriceCents) => patch({ unitPriceCents })}
          discount={draft.kind === 'discount'}
          ariaLabel={`${pl.library.itemPriceLabel}: ${label}`}
          className="w-36"
        />
      </div>

      <VariantField
        item={item}
        allItems={allItems}
        value={draft.variantOf}
        onChange={(variantOf) => patch({ variantOf })}
      />

      <button
        type="button"
        aria-expanded={pricingOpen}
        aria-controls={pricingId}
        onClick={() => setPricingOpen((previous) => !previous)}
        className="text-ink-soft hover:text-ink focus-visible:ring-ring flex items-center gap-1 self-start rounded-[var(--radius-control)] text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', pricingOpen && 'rotate-180')}
          aria-hidden
        />
        {`${pl.library.pricingLabel}: ${MODE_LABELS[draft.pricing.mode]}`}
      </button>

      {pricingOpen ? (
        <div id={pricingId}>
          <PricingEditor
            value={draft.pricing}
            onChange={(pricing) => patch({ pricing })}
            itemName={label}
          />
        </div>
      ) : null}

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
