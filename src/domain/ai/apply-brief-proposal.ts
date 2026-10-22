import { libraryItemToQuoteItem, type LibraryItem } from '../library/schema';
import { newRoom, newSection } from '../quote/factory';
import type { Item, QuoteBody, Unit } from '../quote/schema';
import type { BriefProposal } from './schema';

/**
 * Nałożenie propozycji „brief → wycena" na dokument (FEATURES-AI.md §3).
 *
 * ## Co tu jest, a czego nie ma
 *
 * Funkcja dostaje **gotową bazę** — dokument z szablonu (`fromTemplate`) albo
 * z ustawień (`quoteBodyFromSettings`) — i tylko ją uzupełnia. Nie wie, skąd
 * baza pochodzi, nie zna Supabase, nie zna szablonów; dzięki temu test może
 * sprawdzić każdą regułę na obiektach w pamięci.
 *
 * ## Dlaczego nieznane identyfikatory odpadają po cichu
 *
 * Model dostaje listę `id` z biblioteki i ma z niej korzystać, ale nie ma
 * gwarancji, że nie zmyśli własnego. Pozycja z obcym `libraryItemId` nie ma
 * ani nazwy, ani ceny — nie da się jej dodać bez wymyślania kwoty, a to
 * łamie regułę A2. Zamiast wyjątku zwracamy je w `skipped`: UI może o tym
 * powiedzieć, a dokument i tak powstaje.
 */

/** Strukturalny podzbiór pozycji biblioteki — ten sam, którego chce `libraryItemToQuoteItem`. */
export type BriefLibraryEntry = Pick<
  LibraryItem,
  'id' | 'kind' | 'name' | 'description' | 'unitPriceCents' | 'pricing'
> & { unit?: Unit; unitLabel?: string | null };

export interface ApplyBriefProposalInput {
  proposal: BriefProposal;
  /** Dokument przygotowany przez wołającego; nie jest modyfikowany. */
  base: QuoteBody;
  library: readonly BriefLibraryEntry[];
  /** Identyfikatory typów pomieszczeń workspace'u — obce zamieniamy na `null`. */
  roomTypeIds: ReadonlySet<string>;
}

export interface ApplyBriefProposalResult {
  body: QuoteBody;
  /** `libraryItemId` z propozycji, których nie ma w bibliotece. */
  skipped: string[];
}

/** Tytuł sekcji, gdy baza nie ma żadnej (wycena bez szablonu). */
export const BRIEF_SCOPE_SECTION_TITLE = 'Zakres';

/** Klucz porównania nazw pomieszczeń: „Kuchnia" i „kuchnia " to to samo. */
function roomKey(label: string): string {
  return label.trim().toLowerCase();
}

function findByLibraryId(body: QuoteBody, libraryItemId: string): Item | null {
  for (const section of body.sections) {
    for (const item of section.items) {
      if (item.libraryItemId === libraryItemId) return item;
    }
    for (const group of section.groups) {
      for (const item of group.items) {
        if (item.libraryItemId === libraryItemId) return item;
      }
    }
  }
  return null;
}

export function applyBriefProposal({
  proposal,
  base,
  library,
  roomTypeIds,
}: ApplyBriefProposalInput): ApplyBriefProposalResult {
  const body = structuredClone(base);
  const skipped: string[] = [];

  const title = proposal.title.trim();
  if (title) body.title = title;

  const description = proposal.projectDescription.trim();
  if (description) body.projectDescription = description;

  // Pomieszczenie o tej samej nazwie (bez względu na wielkość liter) już
  // w bazie — zwykle z szablonu — nie dubluje się; co najwyżej rośnie `qty`,
  // bo brief mówiący o trzech pokojach wie więcej niż szablon z jednym.
  const roomByLabel = new Map(body.rooms.map((room) => [roomKey(room.label), room]));
  for (const room of proposal.rooms) {
    const label = room.label.trim();
    if (!label) continue;
    const existing = roomByLabel.get(roomKey(label));
    if (existing) {
      if (room.qty > existing.qty) existing.qty = room.qty;
      continue;
    }
    const added = newRoom({
      label,
      qty: room.qty,
      roomTypeId: room.roomTypeId && roomTypeIds.has(room.roomTypeId) ? room.roomTypeId : null,
    });
    roomByLabel.set(roomKey(label), added);
    body.rooms.push(added);
  }

  const byId = new Map(library.map((entry) => [entry.id, entry]));

  for (const proposed of proposal.items) {
    // Pozycja już w dokumencie (z szablonu albo z wcześniejszego wiersza
    // propozycji) — tylko stan włączenia, bez duplikatu.
    const existing = findByLibraryId(body, proposed.libraryItemId);
    if (existing) {
      existing.enabled = proposed.enabled;
      continue;
    }

    const entry = byId.get(proposed.libraryItemId);
    if (!entry) {
      skipped.push(proposed.libraryItemId);
      continue;
    }

    let target = body.sections[0];
    if (!target) {
      target = newSection({ title: BRIEF_SCOPE_SECTION_TITLE });
      body.sections.push(target);
    }
    target.items.push(libraryItemToQuoteItem(entry, { enabled: proposed.enabled }));
  }

  return { body, skipped };
}
