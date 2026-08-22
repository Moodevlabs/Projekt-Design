import type { Group, Item, QuoteBody, Section } from './schema';

/**
 * Przenoszenie elementów wyceny. Wszystkie funkcje są czyste — zwracają nowy
 * dokument i nigdy nie mutują wejścia. Nieznane id → zwracamy wejście bez zmian
 * (brak wyjątków; UI po prostu nic nie robi).
 */

export interface MoveItemArgs {
  itemId: string;
  toSectionId: string;
  /** null = luźne pozycje sekcji (poza grupami). */
  toGroupId: string | null;
  toIndex: number;
}

export interface MoveGroupArgs {
  groupId: string;
  toSectionId: string;
  toIndex: number;
}

export interface MoveSectionArgs {
  sectionId: string;
  toIndex: number;
}

/** Kierunek przesunięcia przyciskami góra/dół. */
export type NudgeDirection = 'up' | 'down';

/** Przenosi pozycję w obrębie listy, między grupami i między sekcjami. */
export function moveItem(body: QuoteBody, args: MoveItemArgs): QuoteBody {
  const next = structuredClone(body);
  const found = findItem(next, args.itemId);
  if (found === null) return body;

  const targetSection = next.sections.find((section) => section.id === args.toSectionId);
  if (targetSection === undefined) return body;

  const targetList = itemsListOf(targetSection, args.toGroupId);
  if (targetList === null) return body;

  found.list.splice(found.index, 1);
  targetList.splice(clampIndex(args.toIndex, targetList.length), 0, found.item);
  return next;
}

/** Przenosi grupę w obrębie sekcji lub do innej sekcji. */
export function moveGroup(body: QuoteBody, args: MoveGroupArgs): QuoteBody {
  const next = structuredClone(body);
  const found = findGroup(next, args.groupId);
  if (found === null) return body;

  const targetSection = next.sections.find((section) => section.id === args.toSectionId);
  if (targetSection === undefined) return body;

  found.list.splice(found.index, 1);
  targetSection.groups.splice(clampIndex(args.toIndex, targetSection.groups.length), 0, found.group);
  return next;
}

/** Zmienia kolejność sekcji. */
export function moveSection(body: QuoteBody, args: MoveSectionArgs): QuoteBody {
  const next = structuredClone(body);
  const index = next.sections.findIndex((section) => section.id === args.sectionId);
  if (index === -1) return body;

  const removed = next.sections.splice(index, 1);
  next.sections.splice(clampIndex(args.toIndex, next.sections.length), 0, ...removed);
  return next;
}

/** Przesuwa pozycję o jedno miejsce w jej własnej liście. Na krańcu — brak zmian. */
export function nudgeItem(body: QuoteBody, itemId: string, direction: NudgeDirection): QuoteBody {
  const next = structuredClone(body);
  const found = findItem(next, itemId);
  if (found === null) return body;
  return shift(body, next, found.list, found.index, direction);
}

/** Przesuwa grupę o jedno miejsce w jej sekcji. Na krańcu — brak zmian. */
export function nudgeGroup(body: QuoteBody, groupId: string, direction: NudgeDirection): QuoteBody {
  const next = structuredClone(body);
  const found = findGroup(next, groupId);
  if (found === null) return body;
  return shift(body, next, found.list, found.index, direction);
}

/** Przesuwa sekcję o jedno miejsce. Na krańcu — brak zmian. */
export function nudgeSection(
  body: QuoteBody,
  sectionId: string,
  direction: NudgeDirection,
): QuoteBody {
  const next = structuredClone(body);
  const index = next.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return body;
  return shift(body, next, next.sections, index, direction);
}

interface ItemLocation {
  list: Item[];
  index: number;
  item: Item;
}

interface GroupLocation {
  list: Group[];
  index: number;
  group: Group;
}

function findItem(body: QuoteBody, itemId: string): ItemLocation | null {
  for (const section of body.sections) {
    for (const [index, item] of section.items.entries()) {
      if (item.id === itemId) return { list: section.items, index, item };
    }
    for (const group of section.groups) {
      for (const [index, item] of group.items.entries()) {
        if (item.id === itemId) return { list: group.items, index, item };
      }
    }
  }
  return null;
}

function findGroup(body: QuoteBody, groupId: string): GroupLocation | null {
  for (const section of body.sections) {
    for (const [index, group] of section.groups.entries()) {
      if (group.id === groupId) return { list: section.groups, index, group };
    }
  }
  return null;
}

/** Lista pozycji wskazanej grupy albo luźne pozycje sekcji (groupId === null). */
function itemsListOf(section: Section, groupId: string | null): Item[] | null {
  if (groupId === null) return section.items;
  const group = section.groups.find((candidate) => candidate.id === groupId);
  return group === undefined ? null : group.items;
}

/**
 * Przesuwa element listy o jedno miejsce. Gdy nie ma dokąd (pierwszy/ostatni),
 * zwraca oryginalny dokument — referencja się nie zmienia, więc UI nie
 * przerysowuje się bez potrzeby.
 */
function shift<T>(
  original: QuoteBody,
  next: QuoteBody,
  list: T[],
  index: number,
  direction: NudgeDirection,
): QuoteBody {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return original;
  const removed = list.splice(index, 1);
  list.splice(target, 0, ...removed);
  return next;
}

/**
 * Docelowy indeks liczony jest po usunięciu elementu ze źródłowej listy
 * i przycinany do dozwolonego zakresu.
 */
function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.trunc(index), length);
}
