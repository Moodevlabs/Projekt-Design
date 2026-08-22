import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { InlineMoney } from './InlineMoney';
import { ItemToggle } from './ItemToggle';
import { DragHandle } from './DragHandle';
import { MoveButtons } from './MoveButtons';
import { formatMoney } from '@/domain/money';
import type { Item, NudgeDirection } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface ItemRowProps {
  item: Item;
  editing: boolean;
  currency: string;
  /** Pozycja w swojej liście — steruje wyłączaniem strzałek na krańcach. */
  index: number;
  count: number;
  onToggle: (itemId: string) => void;
  onPatch: (itemId: string, patch: Partial<Item>) => void;
  onRemove: (itemId: string) => void;
  onNudge: (itemId: string, direction: NudgeDirection) => void;
}

/**
 * Wiersz pozycji.
 *
 * `memo` jest tu **wymaganiem wydajnosciowym**, nie ozdoba: store dzieli
 * strukture (immer), wiec nietkniete pozycje dostaja ta sama referencje i przy
 * 300 wierszach edycja jednego pola nie renderuje rodzenstwa.
 *
 * Wyłączona pozycja **nie jest wyszarzana ani przekreslana** — zmienia sie tylko
 * kolor nazwy i kwoty. Klient ma dalej czytac, z czego rezygnuje.
 */
export const ItemRow = memo(function ItemRow({
  item,
  editing,
  currency,
  index,
  count,
  onToggle,
  onPatch,
  onRemove,
  onNudge,
}: ItemRowProps) {
  const isDiscount = item.kind === 'discount';
  const valueCents = Math.round(item.qty * item.unitPriceCents);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { kind: 'item', itemId: item.id, label: item.name },
    disabled: !editing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex items-center gap-[14px] border-b py-[13px]',
        'border-[var(--doc-hair)]',
        // Przeciągany wiersz zostaje widoczny, tylko przygaszony — jak w prototypie.
        isDragging && 'relative z-10 opacity-40',
      )}
      data-testid="item-row"
    >
      {editing ? (
        <>
          <DragHandle
            ref={setActivatorNodeRef}
            label={`${pl.editor.dragItem}: ${item.name || pl.editor.newItemName}`}
            {...attributes}
            {...listeners}
          />
          <MoveButtons
            label={item.name || pl.editor.newItemName}
            canMoveUp={index > 0}
            canMoveDown={index < count - 1}
            onMove={(direction) => onNudge(item.id, direction)}
          />
        </>
      ) : null}

      <ItemToggle
        checked={item.enabled}
        onChange={() => onToggle(item.id)}
        label={`${pl.editor.toggleItem}: ${item.name || pl.editor.newItemName}`}
      />

      <div className="min-w-0 flex-1">
        <InlineText
          value={item.name}
          onCommit={(name) => onPatch(item.id, { name })}
          readOnly={!editing}
          placeholder={pl.editor.newItemName}
          ariaLabel={pl.editor.itemNameLabel}
          className={cn(
            'inline-field text-[14.5px] font-semibold',
            item.enabled ? 'text-[var(--doc-ink)]' : 'text-[var(--doc-ink-soft)]',
          )}
        />
        {editing || item.description ? (
          <InlineText
            value={item.description}
            onCommit={(description) => onPatch(item.id, { description })}
            readOnly={!editing}
            multiline
            placeholder={pl.editor.newItemDescription}
            ariaLabel={pl.editor.itemDescriptionLabel}
            className="inline-field text-[13px] leading-[1.55] text-[var(--doc-ink-soft)]"
          />
        ) : null}
      </div>

      {editing ? (
        <input
          type="number"
          min={0}
          step="0.5"
          value={item.qty}
          aria-label={pl.editor.itemQtyLabel}
          onChange={(event) => {
            const next = Number.parseFloat(event.target.value);
            onPatch(item.id, { qty: Number.isFinite(next) && next > 0 ? next : 1 });
          }}
          className="inline-field price-field amount w-14 px-1 py-[2px] text-right text-[14.5px]"
        />
      ) : item.qty !== 1 ? (
        // W podgladzie ilosc pokazujemy tylko wtedy, gdy wnosi informacje —
        // "1 ×" przy kazdej pozycji tylko zasmiecaloby wiersz.
        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">{item.qty} ×</span>
      ) : null}

      <div
        className={cn(
          'flex min-w-[86px] items-center justify-end gap-0.5 text-[14.5px]',
          isDiscount
            ? item.enabled
              ? 'text-[var(--doc-terracotta)]'
              : 'text-[var(--doc-price-off)]'
            : item.enabled
              ? 'text-[var(--doc-ink-soft)]'
              : 'text-[var(--doc-price-off)]',
        )}
      >
        {isDiscount ? <span aria-hidden>−</span> : null}
        {editing ? (
          <InlineMoney
            cents={item.unitPriceCents}
            currency={currency}
            onCommit={(unitPriceCents) => onPatch(item.id, { unitPriceCents })}
            ariaLabel={pl.editor.itemPriceLabel}
            className="price-field inline-field amount w-[76px] text-[14.5px]"
          />
        ) : (
          <span className="amount">{formatMoney(valueCents, currency)}</span>
        )}
      </div>

      {editing ? (
        <button
          type="button"
          aria-label={`${pl.editor.removeItem}: ${item.name || pl.editor.newItemName}`}
          onClick={() => onRemove(item.id)}
          className={cn(
            'flex size-[22px] shrink-0 items-center justify-center rounded-full text-base leading-none',
            'text-[var(--doc-ink-soft)] transition-colors',
            'hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
        >
          <Trash2 className="size-[13px]" aria-hidden />
        </button>
      ) : null}
    </div>
  );
});
