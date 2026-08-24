import type { LibraryItem } from '@/data/repos/library.repo';
import type { ItemKind, PricingRule } from '@/domain/quote';

/** Edytowalne pola pozycji bibliotecznej — to, co karta trzyma lokalnie. */
export interface ItemDraft {
  name: string;
  description: string;
  category: string;
  kind: ItemKind;
  /** `null` = wycena indywidualna (T-60). Nie myl z zerem. */
  unitPriceCents: number | null;
  pricing: PricingRule;
  /** Lider grupy wariantow (`null` = pozycja samodzielna). */
  variantOf: string | null;
}

export function toItemDraft(item: LibraryItem): ItemDraft {
  return {
    name: item.name,
    description: item.description,
    category: item.category,
    kind: item.kind,
    unitPriceCents: item.unitPriceCents,
    pricing: item.pricing,
    variantOf: item.variantOf,
  };
}

/**
 * Odcisk palca szkicu — porównanie stringów zamiast pola po polu. Służy do
 * dwóch rzeczy: wykrycia „są niezapisane zmiany” i rozpoznania, czy świeże dane
 * z serwera można wpuścić do karty bez kasowania tego, co ktoś właśnie wpisał.
 */
export function draftSignature(draft: ItemDraft): string {
  // JSON zamiast sklejania separatorem — nie da się podrobić granicy pól tekstem.
  return JSON.stringify([
    draft.name,
    draft.description,
    draft.category,
    draft.kind,
    draft.unitPriceCents,
    draft.pricing,
    draft.variantOf,
  ]);
}

export function itemSignature(item: LibraryItem): string {
  return draftSignature(toItemDraft(item));
}

/**
 * Pola, które kaskadują z biblioteki do otwartej wyceny. Świadomie WĄSKI zestaw
 * — `qty`, `enabled` i kolejność należą do konkretnej wyceny, nie do biblioteki.
 * Kształt zgodny z `LibraryCascadePatch` z edytora (celowo bez importu stamtąd:
 * biblioteka nie ma zaglądać do wnętrza edytora).
 */
export interface CascadeFields {
  name?: string;
  description?: string;
  unitPriceCents?: number | null;
  pricing?: PricingRule;
}

/** Tylko te z kaskadujących pól, które faktycznie się zmieniły. */
export function cascadeFields(previous: LibraryItem, next: LibraryItem): CascadeFields {
  const patch: CascadeFields = {};
  if (next.name !== previous.name) patch.name = next.name;
  if (next.description !== previous.description) patch.description = next.description;
  if (next.unitPriceCents !== previous.unitPriceCents) patch.unitPriceCents = next.unitPriceCents;
  // Reguła to zagnieżdżony obiekt (mapa cen per pomieszczenie), więc porównanie
  // referencji nic by nie dało — po każdym odczycie z bazy byłaby „inna”.
  if (JSON.stringify(next.pricing) !== JSON.stringify(previous.pricing)) {
    patch.pricing = next.pricing;
  }
  return patch;
}

export function hasCascadeFields(patch: CascadeFields): boolean {
  return Object.keys(patch).length > 0;
}
