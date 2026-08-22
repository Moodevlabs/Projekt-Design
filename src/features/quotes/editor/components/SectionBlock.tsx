import { memo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { ItemRow } from './ItemRow';
import { GroupBlock } from './GroupBlock';
import { AddLink } from './AddLink';
import { DragHandle } from './DragHandle';
import { ConfirmDialog } from '@/components/shared';
import { calcSectionTotals, type Item, type PricesInclude, type Section } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface SectionBlockProps {
  section: Section;
  editing: boolean;
  currency: string;
  vatRate: number;
  pricesInclude: PricesInclude;
  onRename: (sectionId: string, title: string) => void;
  onRemove: (sectionId: string) => void;
  onAddGroup: (sectionId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onAddItem: (sectionId: string, groupId: string | null, kind: Item['kind']) => void;
  onToggleItem: (itemId: string) => void;
  onPatchItem: (itemId: string, patch: Partial<Item>) => void;
  onRemoveItem: (itemId: string) => void;
}

export const SectionBlock = memo(function SectionBlock({
  section,
  editing,
  currency,
  vatRate,
  pricesInclude,
  onRename,
  onRemove,
  onAddGroup,
  onRenameGroup,
  onRemoveGroup,
  onToggleGroup,
  onAddItem,
  onToggleItem,
  onPatchItem,
  onRemoveItem,
}: SectionBlockProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totals = calcSectionTotals(section, { vatRate, pricesInclude });
  const isEmpty = section.items.length === 0 && section.groups.length === 0;

  return (
    <section className="mb-10">
      {/* Kreska pod tytulem sekcji jest CZARNA — mocniejsza niz szara przy
          grupie i jasna przy wierszu. Trzystopniowa hierarchia z prototypu. */}
      <div className="flex items-baseline gap-3 border-b border-[var(--doc-ink)] pb-2.5">
        {editing ? <DragHandle /> : null}

        <InlineText
          value={section.title}
          onCommit={(title) => onRename(section.id, title)}
          readOnly={!editing}
          placeholder={pl.editor.newSectionName}
          ariaLabel={pl.editor.sectionTitleLabel}
          className="inline-field flex-1 text-[18px] font-bold tracking-[0.02em] uppercase"
        />

        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">
          {formatMoney(totals.netCents, currency)}
        </span>

        {editing ? (
          <button
            type="button"
            aria-label={`${pl.editor.removeSection}: ${section.title}`}
            onClick={() => (isEmpty ? onRemove(section.id) : setConfirmOpen(true))}
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

      {section.items.map((item) => (
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
          <AddLink onClick={() => onAddItem(section.id, null, 'item')}>
            {pl.editor.addItem}
          </AddLink>
          <AddLink onClick={() => onAddItem(section.id, null, 'discount')}>
            {pl.editor.addDiscount}
          </AddLink>
        </div>
      ) : null}

      {section.groups.map((group) => (
        <GroupBlock
          key={group.id}
          group={group}
          sectionId={section.id}
          editing={editing}
          currency={currency}
          vatRate={vatRate}
          pricesInclude={pricesInclude}
          onRename={onRenameGroup}
          onRemove={onRemoveGroup}
          onToggleGroup={onToggleGroup}
          onAddItem={onAddItem}
          onToggleItem={onToggleItem}
          onPatchItem={onPatchItem}
          onRemoveItem={onRemoveItem}
        />
      ))}

      {editing ? (
        <div className="mt-4">
          <AddLink onClick={() => onAddGroup(section.id)}>{pl.editor.addGroup}</AddLink>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={pl.editor.removeSectionConfirmTitle}
        description={pl.editor.removeConfirmDescription}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => onRemove(section.id)}
      />
    </section>
  );
});
