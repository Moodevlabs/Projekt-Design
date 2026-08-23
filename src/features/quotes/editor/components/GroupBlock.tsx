import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { ItemRow } from './ItemRow';
import { ItemToggle } from './ItemToggle';
import { AddLink } from './AddLink';
import { LibraryPicker } from './LibraryPicker';
import { SaveToLibraryButton } from './SaveToLibraryButton';
import { DragHandle } from './DragHandle';
import { useStableIds } from '../dnd/useStableIds';
import type { VariantOptions } from '../useVariantOptions';
import type { ItemVariant } from '../editor.store';
import { ConfirmDialog } from '@/components/shared';
import {
  calcGroupTotals,
  type Group,
  type Item,
  type PricesInclude,
  type Room,
} from '@/domain/quote';
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
  /** Pomieszczenia wyceny — potrzebne do policzenia pozycji parametrycznych. */
  rooms: Room[];
  /** Warianty pozycji (F1.4) — przekazywane w dół bez zmian. */
  variants: VariantOptions;
  onVariantChange: (itemId: string, variant: ItemVariant) => void;
  onRename: (groupId: string, name: string) => void;
  onRemove: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onAddItem: (sectionId: string, groupId: string | null) => void;
  onToggleItem: (itemId: string) => void;
  onPatchItem: (itemId: string, patch: Partial<Item>) => void;
  onRemoveItem: (itemId: string) => void;
  onInsertItems: (sectionId: string, groupId: string | null, items: Item[]) => void;
  onSaveItemToLibrary: (item: Item) => void;
  onSaveGroupToLibrary: (group: Group) => void;
  onInsertItemToRoomBlocks: (sectionId: string, item: Item) => void;
}

export const GroupBlock = memo(function GroupBlock({
  group,
  sectionId,
  editing,
  currency,
  vatRate,
  pricesInclude,
  rooms,
  variants,
  onVariantChange,
  onRename,
  onRemove,
  onToggleGroup,
  onAddItem,
  onToggleItem,
  onPatchItem,
  onRemoveItem,
  onInsertItems,
  onSaveItemToLibrary,
  onSaveGroupToLibrary,
  onInsertItemToRoomBlocks,
}: GroupBlockProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // `rooms` są konieczne: bez nich pozycja `per_room` policzyłaby samą bazę
  // i nagłówek pokazałby inną kwotę niż podsumowanie wyceny.
  const totals = calcGroupTotals(group, { vatRate, pricesInclude, rooms });

  // Do biblioteki idą tylko nazwane pozycje (snapshot wymaga nazwy), więc po
  // nich poznajemy też, czy jest w ogóle co zapisywać.
  const namedItems = group.items.filter((item) => item.name.trim().length > 0);

  // Blok pomieszczenia: nazwa i stan biora sie z `Room`, nie z samej grupy.
  const room = group.roomId ? (rooms.find((r) => r.id === group.roomId) ?? null) : null;
  // Pomieszczenie odznaczone w OBU czesciach nie wchodzi do zadnej uslugi —
  // blok zostaje widoczny, ale oznaczony, zeby bylo wiadomo dlaczego liczy zero.
  const pominiete = room !== null && !room.includedInVisual && !room.includedInTechnical;

  // Stan przelacznika grupy wyliczamy z pozycji — nie trzymamy go w modelu.
  const enabledCount = group.items.filter((item) => item.enabled).length;
  const allOn = group.items.length > 0 && enabledCount === group.items.length;
  const someOn = enabledCount > 0 && !allOn;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: { kind: 'group', groupId: group.id, label: group.name },
    disabled: !editing,
  });

  // Osobny cel upuszczenia na LISTĘ pozycji — bez niego nie dałoby się
  // przenieść pozycji do pustej grupy, bo nie byłoby czego dotknąć.
  const itemIds = useStableIds(group.items);

  const { setNodeRef: setListRef, isOver } = useDroppable({
    id: `list:${sectionId}:${group.id}`,
    data: { kind: 'item-list', sectionId, groupId: group.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'mt-[34px] [&_+_&]:border-t-[1.5px] [&_+_&]:border-[var(--doc-hair-strong)] [&_+_&]:pt-[26px]',
        isDragging &&
          'relative z-20 rounded-[var(--radius-card)] bg-[var(--doc-surface)] shadow-[0_16px_34px_-12px_rgba(20,22,28,0.45)]',
      )}
    >
      <div className="flex items-center gap-3 pb-1">
        {editing ? (
          <DragHandle
            ref={setActivatorNodeRef}
            label={`${pl.editor.dragGroup}: ${group.name}`}
            {...attributes}
            {...listeners}
          />
        ) : null}

        <ItemToggle
          checked={allOn}
          indeterminate={someOn}
          onChange={() => onToggleGroup(group.id)}
          label={`${pl.editor.toggleGroup}: ${group.name}`}
        />

        {room ? (
          // Blok pomieszczenia bierze nazwe z panelu pomieszczen — edycja tutaj
          // rozjechalaby etykiete z tym, co liczy cennik.
          <span
            className={cn(
              'flex-1 text-[13px] font-semibold tracking-[0.03em] uppercase',
              pominiete ? 'text-[var(--doc-ink-soft)]' : 'text-[var(--doc-sage)]',
            )}
          >
            {pl.editor.roomBlockLabel(room.label || pl.editor.newRoomName, room.qty)}
            {pominiete ? (
              <span className="ml-1.5 text-[11px] normal-case">({pl.editor.roomBlockOff})</span>
            ) : null}
          </span>
        ) : (
          <InlineText
            value={group.name}
            onCommit={(name) => onRename(group.id, name)}
            readOnly={!editing}
            placeholder={pl.editor.newGroupName}
            ariaLabel={pl.editor.groupNameLabel}
            className="inline-field flex-1 text-[13px] font-semibold tracking-[0.03em] text-[var(--doc-sage)] uppercase"
          />
        )}

        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">
          {formatMoney(totals.netCents, currency)}
        </span>

        {editing ? (
          <SaveToLibraryButton
            label={`${pl.editor.saveGroupToLibrary}: ${group.name || pl.editor.newGroupName}`}
            savedLabel={`${pl.editor.savedGroupToLibrary}: ${group.name || pl.editor.newGroupName}`}
            // Zestaw bez nazwy albo bez pozycji nie ma czego zapisać —
            // snapshot wymaga nazwy, a pusty zestaw nic nie wnosi do biblioteki.
            disabled={group.name.trim().length === 0 || namedItems.length === 0}
            onSave={() => onSaveGroupToLibrary(group)}
          />
        ) : null}

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

      <div
        ref={setListRef}
        className={cn(
          'min-h-[8px] rounded-[var(--radius-control)] transition-colors',
          isOver && 'bg-[var(--doc-sage-light)]',
        )}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {group.items.map((item) => (
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
              variants={variants}
              onVariantChange={onVariantChange}
            />
          ))}
        </SortableContext>
      </div>

      {editing ? (
        <div className="mt-2.5 flex items-center gap-4">
          <AddLink onClick={() => onAddItem(sectionId, group.id)}>{pl.editor.addItem}</AddLink>
          <LibraryPicker
            priorityCategory={group.name}
            onPickItem={(item) => onInsertItems(sectionId, group.id, [item])}
          />
          {room ? (
            // Skrót z arkusza: ta sama usługa idzie zwykle do każdego
            // pomieszczenia naraz, a nie do jednego.
            <LibraryPicker
              priorityCategory={group.name}
              label={pl.editor.addItemToAllRooms}
              onPickItem={(item) => onInsertItemToRoomBlocks(sectionId, item)}
            />
          ) : null}
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
