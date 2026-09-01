import { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineText } from './InlineText';
import { ItemRow } from './ItemRow';
import { GroupBlock } from './GroupBlock';
import { AddLink } from './AddLink';

import { DragHandle } from './DragHandle';
import { ItemsColumnsHeader } from './ItemsColumnsHeader';
import { useStableIds } from '../dnd/useStableIds';
import { useScopePanel } from '../scope/scope-panel.store';
import { useGroupPicker } from '../scope/group-picker.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocumentTextInfo, PricingContext } from '@/domain/quote';
import type { LibraryCategory } from '@/domain/library/schema';
import type { VariantOptions } from '../useVariantOptions';
import type { ItemVariant } from '../editor.store';
import { ConfirmDialog } from '@/components/shared';
import {
  calcSectionTotals,
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
  /** Dane dokumentu do placeholderów w opisach (F4.2). */
  textInfo: DocumentTextInfo;
  /** Tryb liczenia (F2.1) — przekazywany w dół bez zmian. */
  pricing: PricingContext;
  /** Warianty pozycji (F1.4) — przekazywane w dół bez zmian. */
  variants: VariantOptions;
  /** Słownik grup bibliotecznych (T-120) — przekazywany blokom bez zmian. */
  categories?: ReadonlyMap<string, LibraryCategory>;
  onVariantChange: (itemId: string, variant: ItemVariant) => void;
  onRename: (sectionId: string, title: string) => void;
  onRemove: (sectionId: string) => void;
  onAddGroup: (sectionId: string) => void;
  /** Rozpisz na pomieszczenia — blok na kazde pomieszczenie wyceny (T-111). */
  onAddRoomBlocks: (sectionId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onToggleGroup: (groupId: string) => void;
  onAddItem: (sectionId: string, groupId: string | null) => void;
  onToggleItem: (itemId: string) => void;
  onPatchItem: (itemId: string, patch: Partial<Item>) => void;
  onRemoveItem: (itemId: string) => void;
  /** „Rozpisz na pomieszczenia” — po jednym bloku na każde pomieszczenie wyceny. */
}

export const SectionBlock = memo(function SectionBlock({
  section,
  editing,
  currency,
  vatRate,
  pricesInclude,
  rooms,
  textInfo,
  pricing,
  variants,
  categories,
  onVariantChange,
  onRename,
  onRemove,
  onAddGroup,
  onAddRoomBlocks,
  onRenameGroup,
  onRemoveGroup,
  onToggleGroup,
  onAddItem,
  onToggleItem,
  onPatchItem,
  onRemoveItem,
}: SectionBlockProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Akcja ze store'u ma stałą referencję — nie przebija `memo` na bloku.
  const openScope = useScopePanel((state) => state.openFor);
  const openGroupPicker = useGroupPicker((state) => state.openFor);
  const totals = calcSectionTotals(section, pricing, { vatRate, pricesInclude, rooms });
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

      {editing && section.items.length > 0 ? <ItemsColumnsHeader /> : null}

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
              rooms={rooms}
              textInfo={textInfo}
              pricing={pricing}
              variants={variants}
              onVariantChange={onVariantChange}
            />
          ))}
        </SortableContext>
      </div>

      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {/*
            DWA WEJŚCIA, nie cztery (poprawka 7, 2026-08-27).

            „Dodaj usługi" otwiera panel z całą biblioteką — usługami
            i zestawami, z wyszukiwarką i filtrem grup. Osobny picker
            biblioteki stał obok i robił dokładnie to samo w węższym oknie,
            więc pasek akcji zadawał pytanie „którym z dwóch sposobów chcesz
            zrobić tę samą rzecz".

            „Rozpisz na pomieszczenia" WROCILO (T-111, decyzja wlasciciela):
            przy ofertach per pomieszczenie zakladanie blokow recznie bylo
            realna kara. Komunikat po kliknieciu mowi, ile blokow przybylo.
          */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-[var(--radius-pill)] border-[var(--doc-ink)] bg-transparent px-3 text-[12.5px] font-semibold text-[var(--doc-ink)] hover:bg-[var(--doc-ink)] hover:text-white"
            onClick={() => openScope({ sectionId: section.id, groupId: null })}
          >
            <Plus className="size-3.5" aria-hidden />
            {pl.editor.scopeOpen}
          </Button>
          <AddLink onClick={() => onAddItem(section.id, null)}>{pl.editor.addItemManual}</AddLink>
          <AddLink icon={LayoutGrid} onClick={() => onAddRoomBlocks(section.id)}>
            {pl.editor.addRoomBlocks}
          </AddLink>
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
              textInfo={textInfo}
              pricing={pricing}
              variants={variants}
              categories={categories}
              onVariantChange={onVariantChange}
              onRename={onRenameGroup}
              onRemove={onRemoveGroup}
              onToggleGroup={onToggleGroup}
              onAddItem={onAddItem}
              onToggleItem={onToggleItem}
              onPatchItem={onPatchItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </SortableContext>
      </div>

      {editing ? (
        <div className="mt-4">
          {/*
            „Dodaj grupę" jest MENU, nie jednym gestem (T-120). Do tej pory
            robiło zawsze pustą „Nową grupę", a grupa z biblioteki dawała się
            wstawić wyłącznie przez „Dodaj usługi" → zakładka „Zestawy" — i to
            tylko wtedy, gdy cel panelu był ustawiony na sekcję. Wejście do
            biblioteki musi stać tam, gdzie człowiek szuka grupy.
          */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <AddLink aria-haspopup="menu">{pl.editor.addGroup}</AddLink>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => onAddGroup(section.id)}>
                {pl.editor.addGroupEmpty}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openGroupPicker(section.id, 'categories')}>
                {pl.editor.addGroupFromCategory}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openGroupPicker(section.id, 'sets')}>
                {pl.editor.addGroupFromSet}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
