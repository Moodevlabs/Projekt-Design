import { memo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { ItemRow } from './ItemRow';
import { ItemToggle } from './ItemToggle';
import { AddLink } from './AddLink';
import { DragHandle } from './DragHandle';
import { ConfirmDialog } from '@/components/shared';
import { calcGroupTotals, type Group, type Item, type PricesInclude } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface GroupBlockProps {
  group: Group;
  sectionId: string;
  editing: boolean;
  currency: string;
  vatRate: number;
  pricesInclude: PricesInclude;
  onRename: (groupId: string, name: string) => void;
  onRemove: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onAddItem: (sectionId: string, groupId: string | null, kind: Item['kind']) => void;
  onToggleItem: (itemId: string) => void;
  onPatchItem: (itemId: string, patch: Partial<Item>) => void;
  onRemoveItem: (itemId: string) => void;
}

export const GroupBlock = memo(function GroupBlock({
  group,
  sectionId,
  editing,
  currency,
  vatRate,
  pricesInclude,
  onRename,
  onRemove,
  onToggleGroup,
  onAddItem,
  onToggleItem,
  onPatchItem,
  onRemoveItem,
}: GroupBlockProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totals = calcGroupTotals(group, { vatRate, pricesInclude });

  // Stan przelacznika grupy wyliczamy z pozycji — nie trzymamy go w modelu.
  const enabledCount = group.items.filter((item) => item.enabled).length;
  const allOn = group.items.length > 0 && enabledCount === group.items.length;
  const someOn = enabledCount > 0 && !allOn;

  return (
    <div className="mt-[34px] [&_+_&]:border-t-[1.5px] [&_+_&]:border-[var(--doc-hair-strong)] [&_+_&]:pt-[26px]">
      <div className="flex items-center gap-3 pb-1">
        {editing ? <DragHandle /> : null}

        <ItemToggle
          checked={allOn}
          indeterminate={someOn}
          onChange={() => onToggleGroup(group.id)}
          label={`${pl.editor.toggleGroup}: ${group.name}`}
        />

        <InlineText
          value={group.name}
          onCommit={(name) => onRename(group.id, name)}
          readOnly={!editing}
          placeholder={pl.editor.newGroupName}
          ariaLabel={pl.editor.groupNameLabel}
          className="inline-field flex-1 text-[13px] font-semibold tracking-[0.03em] text-[var(--doc-sage)] uppercase"
        />

        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">
          {formatMoney(totals.netCents, currency)}
        </span>

        {editing ? (
          <button
            type="button"
            aria-label={`${pl.editor.removeGroup}: ${group.name}`}
            onClick={() => setConfirmOpen(true)}
            className={cn(
              'flex size-[22px] shrink-0 items-center justify-center rounded-full',
              'text-[var(--doc-ink-soft)] transition-colors',
              'hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]',
            )}
          >
            <Trash2 className="size-[13px]" aria-hidden />
          </button>
        ) : null}
      </div>

      {group.items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          editing={editing}
          currency={currency}
          onToggle={onToggleItem}
          onPatch={onPatchItem}
          onRemove={onRemoveItem}
        />
      ))}

      {editing ? (
        <div className="mt-2.5 flex items-center gap-4">
          <AddLink onClick={() => onAddItem(sectionId, group.id, 'item')}>
            {pl.editor.addItem}
          </AddLink>
          <AddLink onClick={() => onAddItem(sectionId, group.id, 'discount')}>
            {pl.editor.addDiscount}
          </AddLink>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.editor.removeGroupConfirmTitle}
        description={pl.editor.removeConfirmDescription}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => onRemove(group.id)}
      />
    </div>
  );
});
