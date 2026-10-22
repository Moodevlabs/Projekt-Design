import { libraryItemToQuoteItem, type LibraryItem } from '../library/schema';
import type { Item, QuoteBody, Unit } from '../quote/schema';
import type { CommentChange } from './schema';

/**
 * Nakładanie propozycji z uwag inwestora na dokument wyceny (FEATURES-AI.md §4).
 *
 * ## Dlaczego domena, a nie komponent
 *
 * Model oddaje listę zmian z identyfikatorami, które sam dostał w ładunku
 * (`quoteView`, `libraryEntries`). Każdy z nich może być zmyślony, przestarzały
 * albo wskazywać na pozycję, której zmiana w ten sposób nie jest dozwolona.
 * Komponent nie ma prawa o tym rozstrzygać (reguła A4) — tu jest jedno
 * miejsce, które mówi, co weszło, co odpadło i dlaczego, a podgląd w dialogu
 * i zapis nowej wersji używają tej samej funkcji.
 *
 * ## Reguły
 *
 * - `disable` / `enable` przestawiają `enabled` istniejącej pozycji.
 * - `remove` usuwa pozycję **tylko wyłączoną** (`enabled_item` w przeciwnym
 *   razie). Pozycję włączoną AI może co najwyżej wyłączyć — klient dalej
 *   widzi ją jako opcję, a projektant nie traci rozpisanej pracy. Zmiany idą
 *   po kolei, więc `disable` + `remove` tej samej pozycji w jednej propozycji
 *   przechodzi.
 * - `add` wstawia usługę z biblioteki do sekcji o podanym id przez
 *   `libraryItemToQuoteItem` — cena jedzie z biblioteki, nigdy z modelu (A2).
 * - `qty` ustawia ilość; musi być liczbą większą od zera.
 *
 * Wejście nie jest mutowane: wynik to nowy dokument.
 */

/** Podzbiór pozycji bibliotecznej potrzebny do wstawienia — ten sam co w `libraryItemToQuoteItem`. */
export type CommentChangeLibraryItem = Pick<
  LibraryItem,
  'id' | 'kind' | 'name' | 'description' | 'unitPriceCents' | 'pricing'
> & { unit?: Unit; unitLabel?: string | null };

export type CommentChangeSkipReason =
  'unknown_item' | 'unknown_section' | 'unknown_library' | 'enabled_item' | 'bad_qty';

export interface SkippedCommentChange {
  change: CommentChange;
  reason: CommentChangeSkipReason;
}

export interface ApplyCommentChangesResult {
  body: QuoteBody;
  applied: CommentChange[];
  skipped: SkippedCommentChange[];
}

/** Gdzie w dokumencie leży pozycja — lista, w której siedzi, i jej indeks. */
interface ItemSlot {
  list: Item[];
  index: number;
  sectionTitle: string;
}

function findItemSlot(body: QuoteBody, itemId: string): ItemSlot | null {
  for (const section of body.sections) {
    const loose = section.items.findIndex((item) => item.id === itemId);
    if (loose !== -1) return { list: section.items, index: loose, sectionTitle: section.title };
    for (const group of section.groups) {
      const inGroup = group.items.findIndex((item) => item.id === itemId);
      if (inGroup !== -1) {
        return { list: group.items, index: inGroup, sectionTitle: section.title };
      }
    }
  }
  return null;
}

function validQty(qty: number): boolean {
  return Number.isFinite(qty) && qty > 0;
}

export function applyCommentChanges(
  body: QuoteBody,
  changes: readonly CommentChange[],
  library: readonly CommentChangeLibraryItem[],
): ApplyCommentChangesResult {
  const next = structuredClone(body);
  const applied: CommentChange[] = [];
  const skipped: SkippedCommentChange[] = [];
  const libraryById = new Map(library.map((item) => [item.id, item]));

  for (const change of changes) {
    const reason = applyOne(next, change, libraryById);
    if (reason === null) applied.push(change);
    else skipped.push({ change, reason });
  }

  return { body: next, applied, skipped };
}

/** Nakłada jedną zmianę NA MIEJSCU (na kopii) i oddaje powód odrzucenia albo `null`. */
function applyOne(
  body: QuoteBody,
  change: CommentChange,
  libraryById: ReadonlyMap<string, CommentChangeLibraryItem>,
): CommentChangeSkipReason | null {
  switch (change.kind) {
    case 'disable':
    case 'enable': {
      const slot = findItemSlot(body, change.itemId);
      if (!slot) return 'unknown_item';
      slot.list[slot.index] = { ...slot.list[slot.index]!, enabled: change.kind === 'enable' };
      return null;
    }
    case 'remove': {
      const slot = findItemSlot(body, change.itemId);
      if (!slot) return 'unknown_item';
      if (slot.list[slot.index]!.enabled) return 'enabled_item';
      slot.list.splice(slot.index, 1);
      return null;
    }
    case 'qty': {
      if (!validQty(change.qty)) return 'bad_qty';
      const slot = findItemSlot(body, change.itemId);
      if (!slot) return 'unknown_item';
      slot.list[slot.index] = { ...slot.list[slot.index]!, qty: change.qty };
      return null;
    }
    case 'add': {
      const libraryItem = libraryById.get(change.libraryItemId);
      if (!libraryItem) return 'unknown_library';
      const section = body.sections.find((candidate) => candidate.id === change.sectionId);
      if (!section) return 'unknown_section';
      section.items.push(libraryItemToQuoteItem(libraryItem));
      return null;
    }
  }
}

export interface CommentChangeDescription {
  /** Nazwa pozycji (albo usługi z biblioteki przy `add`); `null`, gdy id nie trafia. */
  itemName: string | null;
  /** Tytuł sekcji, której zmiana dotyczy; `null`, gdy nie da się ustalić. */
  sectionTitle: string | null;
}

/**
 * Etykiety do zdania w UI („Wyłącz **Wizualizacje łazienki**”).
 *
 * Osobno od `applyCommentChanges`, bo lista w dialogu opisuje każdą zmianę
 * względem dokumentu SPRZED nałożenia — także te, które domena odrzuci.
 */
export function describeChange(
  change: CommentChange,
  body: QuoteBody,
  library: readonly CommentChangeLibraryItem[],
): CommentChangeDescription {
  if (change.kind === 'add') {
    const libraryItem = library.find((item) => item.id === change.libraryItemId);
    const section = body.sections.find((candidate) => candidate.id === change.sectionId);
    return { itemName: libraryItem?.name ?? null, sectionTitle: section?.title ?? null };
  }
  const slot = findItemSlot(body, change.itemId);
  if (!slot) return { itemName: null, sectionTitle: null };
  return { itemName: slot.list[slot.index]!.name, sectionTitle: slot.sectionTitle };
}
