import type { MoveGroupArgs, MoveItemArgs, MoveSectionArgs, QuoteBody } from '@/domain/quote';

/** Co jest przeciągane. Trafia do `data` elementu w @dnd-kit. */
export type DragData =
  | { kind: 'item'; itemId: string }
  | { kind: 'group'; groupId: string }
  | { kind: 'section'; sectionId: string };

/**
 * Nad czym można upuścić. Poza samymi elementami są też **puste pojemniki** —
 * bez nich nie dałoby się przenieść pozycji do pustej grupy ani grupy do
 * pustej sekcji, bo nie byłoby czego „dotknąć".
 */
export type DropData =
  | DragData
  | { kind: 'item-list'; sectionId: string; groupId: string | null }
  | { kind: 'section-groups'; sectionId: string };

export type ReorderIntent =
  | { kind: 'item'; args: MoveItemArgs }
  | { kind: 'group'; args: MoveGroupArgs }
  | { kind: 'section'; args: MoveSectionArgs };

interface ItemLocation {
  sectionId: string;
  groupId: string | null;
  index: number;
  length: number;
}

interface GroupLocation {
  sectionId: string;
  index: number;
}

export function locateItem(body: QuoteBody, itemId: string): ItemLocation | null {
  for (const section of body.sections) {
    const loose = section.items.findIndex((item) => item.id === itemId);
    if (loose !== -1) {
      return {
        sectionId: section.id,
        groupId: null,
        index: loose,
        length: section.items.length,
      };
    }

    for (const group of section.groups) {
      const inGroup = group.items.findIndex((item) => item.id === itemId);
      if (inGroup !== -1) {
        return {
          sectionId: section.id,
          groupId: group.id,
          index: inGroup,
          length: group.items.length,
        };
      }
    }
  }
  return null;
}

export function locateGroup(body: QuoteBody, groupId: string): GroupLocation | null {
  for (const section of body.sections) {
    const index = section.groups.findIndex((group) => group.id === groupId);
    if (index !== -1) return { sectionId: section.id, index };
  }
  return null;
}

function listLength(body: QuoteBody, sectionId: string, groupId: string | null): number {
  const section = body.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return 0;
  if (groupId === null) return section.items.length;
  return section.groups.find((group) => group.id === groupId)?.items.length ?? 0;
}

/** Sekcja, w której leży cokolwiek, nad czym trzymamy kursor. */
function sectionIdOf(body: QuoteBody, over: DropData): string | null {
  switch (over.kind) {
    case 'section':
      return over.sectionId;
    case 'item-list':
    case 'section-groups':
      return over.sectionId;
    case 'group':
      return locateGroup(body, over.groupId)?.sectionId ?? null;
    case 'item':
      return locateItem(body, over.itemId)?.sectionId ?? null;
  }
}

/**
 * Zamienia parę „co przeciągam / nad czym puszczam" na konkretny ruch.
 *
 * Zwraca `null`, gdy ruch nic by nie zmienił — dzięki temu samo kliknięcie
 * uchwytu (przeciągnięcie o zero pikseli) nie brudzi dokumentu i nie budzi
 * autozapisu.
 *
 * Indeks liczymy w konwencji „wstaw na miejsce elementu, nad którym jesteśmy",
 * a `moveItem` w domenie najpierw usuwa element, potem wstawia. Przy ruchu
 * w dół w tej samej liście daje to wynik „za elementem docelowym", przy ruchu
 * w górę „przed nim" — czyli dokładnie to, czego oczekuje się od przeciągania.
 */
export function resolveDrop(
  body: QuoteBody,
  active: DragData,
  over: DropData,
): ReorderIntent | null {
  if (active.kind === 'item') return resolveItemDrop(body, active.itemId, over);
  if (active.kind === 'group') return resolveGroupDrop(body, active.groupId, over);
  return resolveSectionDrop(body, active.sectionId, over);
}

function resolveItemDrop(body: QuoteBody, itemId: string, over: DropData): ReorderIntent | null {
  const from = locateItem(body, itemId);
  if (!from) return null;

  let toSectionId: string;
  let toGroupId: string | null;
  let toIndex: number;

  switch (over.kind) {
    case 'item': {
      if (over.itemId === itemId) return null;
      const target = locateItem(body, over.itemId);
      if (!target) return null;
      toSectionId = target.sectionId;
      toGroupId = target.groupId;
      toIndex = target.index;
      break;
    }
    case 'item-list': {
      toSectionId = over.sectionId;
      toGroupId = over.groupId;
      toIndex = listLength(body, over.sectionId, over.groupId);
      break;
    }
    case 'group': {
      // Upuszczenie na nagłówek grupy = wrzucenie pozycji na jej koniec.
      const target = locateGroup(body, over.groupId);
      if (!target) return null;
      toSectionId = target.sectionId;
      toGroupId = over.groupId;
      toIndex = listLength(body, target.sectionId, over.groupId);
      break;
    }
    case 'section':
    case 'section-groups': {
      toSectionId = over.sectionId;
      toGroupId = null;
      toIndex = listLength(body, over.sectionId, null);
      break;
    }
  }

  const sameList = from.sectionId === toSectionId && from.groupId === toGroupId;
  if (sameList && (toIndex === from.index || toIndex === from.index + 1)) return null;

  return { kind: 'item', args: { itemId, toSectionId, toGroupId, toIndex } };
}

function resolveGroupDrop(body: QuoteBody, groupId: string, over: DropData): ReorderIntent | null {
  const from = locateGroup(body, groupId);
  if (!from) return null;

  if (over.kind === 'group') {
    if (over.groupId === groupId) return null;
    const target = locateGroup(body, over.groupId);
    if (!target) return null;
    if (target.sectionId === from.sectionId && target.index === from.index) return null;
    return {
      kind: 'group',
      args: { groupId, toSectionId: target.sectionId, toIndex: target.index },
    };
  }

  const toSectionId = sectionIdOf(body, over);
  if (!toSectionId) return null;

  const section = body.sections.find((candidate) => candidate.id === toSectionId);
  if (!section) return null;
  if (toSectionId === from.sectionId && from.index === section.groups.length - 1) return null;

  return { kind: 'group', args: { groupId, toSectionId, toIndex: section.groups.length } };
}

function resolveSectionDrop(
  body: QuoteBody,
  sectionId: string,
  over: DropData,
): ReorderIntent | null {
  const fromIndex = body.sections.findIndex((section) => section.id === sectionId);
  if (fromIndex === -1) return null;

  const overSectionId = sectionIdOf(body, over);
  if (!overSectionId || overSectionId === sectionId) return null;

  const toIndex = body.sections.findIndex((section) => section.id === overSectionId);
  if (toIndex === -1 || toIndex === fromIndex) return null;

  return { kind: 'section', args: { sectionId, toIndex } };
}
