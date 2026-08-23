import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { ItemRow } from './ItemRow';
import { GroupBlock } from './GroupBlock';
import { AddLink } from './AddLink';
import { LibraryPicker } from './LibraryPicker';
import { DragHandle } from './DragHandle';
import { useStableIds } from '../dnd/useStableIds';
import { ConfirmDialog } from '@/components/shared';
import {
  calcSectionTotals,
  type Group,
  type Item,
  type PricesInclude,
  type Room,
  type Section,
} from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export interface SectionBlockProps {
  section: Section;
  editing: boolean;
  currency: string;
  vatRate: number;
  pricesInclude: PricesInclude;
  /** Pomieszczenia wyceny — potrzebne do policzenia pozycji parametrycznych. */
  rooms: Room[];
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
  onInsertItems: (sectionId: string, groupId: string | null, items: Item[]) => void;
  onInsertGroup: (sectionId: string, group: Group) => void;
  onSaveItemToLibrary: (item: Item) => void;
  onSaveGroupToLibrary: (group: Group) => void;
}

export const SectionBlock = memo(function SectionBlock({
  section,
  editing,
  currency,
  vatRate,
  pricesInclude,
  rooms,
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
  onInsertItems,
  onInsertGroup,
  onSaveItemToLibrary,
  onSaveGroupToLibrary,
}: SectionBlockProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totals = calcSectionTotals(section, { vatRate, pricesInclude, rooms });
  const isEmpty = section.items.length === 0 && section.groups.length === 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: { kind: 'section', sectionId: section.id, label: section.title },
    disabled: !editing,
  });

  const looseItemIds = useStableIds(section.items);
  const groupIds = useStableIds(section.groups);

  const { setNodeRef: setLooseRef, isOver: isOverLoose } = useDroppable({
    id: `list:${section.id}:root`,
    data: { kind: 'item-list', sectionId: section.id, groupId: null },
  });

  // Cel dla GRUP — pozwala przenieść grupę do sekcji, która żadnej nie ma.
  const { setNodeRef: setGroupsRef, isOver: isOverGroups } = useDroppable({
    id: `groups:${section.id}`,
    data: { kind: 'section-groups', sectionId: section.id },
  });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'mb-10',
        isDragging &&
          'relative z-20 rounded-[var(--radius-card)] bg-[var(--doc-surface)] px-4 shadow-[0_18px_38px_-12px_rgba(20,22,28,0.45)]',
      )}
    >
      {/* Kreska pod tytulem sekcji jest CZARNA — mocniejsza niz szara przy
          grupie i jasna przy wierszu. Trzystopniowa hierarchia z prototypu. */}
      <div className="flex items-center gap-3 border-b border-[var(--doc-ink)] pb-2.5">
        {editing ? (
          <DragHandle
            ref={setActivatorNodeRef}
            label={`${pl.editor.dragSection}: ${section.title}`}
            {...attributes}
            {...listeners}
          />
        ) : null}

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

      <div
        ref={setLooseRef}
        className={cn(
          'min-h-[8px] rounded-[var(--radius-control)] transition-colors',
          isOverLoose && 'bg-[var(--doc-sage-light)]',
        )}
      >
        <SortableContext items={looseItemIds} strategy={verticalListSortingStrategy}>
          {section.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              editing={editing}
              currency={currency}
              onToggle={onToggleItem}
              onPatch={onPatchItem}
              onRemove={onRemoveItem}
              onSaveToLibrary={onSaveItemToLibrary}
              rooms={rooms}
            />
          ))}
        </SortableContext>
      </div>

      {editing ? (
        <div className="mt-2.5 flex items-center gap-4">
          <AddLink onClick={() => onAddItem(section.id, null, 'item')}>{pl.editor.addItem}</AddLink>
          <AddLink onClick={() => onAddItem(section.id, null, 'discount')}>
            {pl.editor.addDiscount}
          </AddLink>
          <LibraryPicker
            priorityCategory={section.title}
            onPickItem={(item) => onInsertItems(section.id, null, [item])}
            onPickGroup={(group) => onInsertGroup(section.id, group)}
          />
        </div>
      ) : null}

      <div
        ref={setGroupsRef}
        className={cn(
          'min-h-[8px] rounded-[var(--radius-control)] transition-colors',
          isOverGroups && 'bg-[var(--doc-sage-light)]',
        )}
      >
        <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
          {section.groups.map((group) => (
            <GroupBlock
              key={group.id}
              group={group}
              sectionId={section.id}
              editing={editing}
              currency={currency}
              vatRate={vatRate}
              pricesInclude={pricesInclude}
              rooms={rooms}
              onRename={onRenameGroup}
              onRemove={onRemoveGroup}
              onToggleGroup={onToggleGroup}
              onAddItem={onAddItem}
              onToggleItem={onToggleItem}
              onPatchItem={onPatchItem}
              onRemoveItem={onRemoveItem}
              onInsertItems={onInsertItems}
              onSaveItemToLibrary={onSaveItemToLibrary}
              onSaveGroupToLibrary={onSaveGroupToLibrary}
            />
          ))}
        </SortableContext>
      </div>

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
