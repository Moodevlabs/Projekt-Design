import { pricingRuleForChoice, unitForChoice } from '../library/units';
import type { PricingRule, Unit } from '../quote/schema';
import type { LibraryImportProposal } from './schema';

/**
 * Nakładanie propozycji importu (T-136) na bibliotekę — czysta funkcja
 * (FEATURES-AI.md §2, reguła A4).
 *
 * ## Co tu się rozstrzyga
 *
 * Model oddaje **słowa**: nazwę grupy i identyfikator sposobu wyceny
 * (`flat_m2`, `individual`…). Biblioteka chce **pary** `(mode, unit)`
 * i identyfikatora grupy. To tutaj słowa stają się parami, przez te same
 * funkcje, których używa karta usługi (`unitForChoice`,
 * `pricingRuleForChoice`) — żeby import nie zapisał czegoś, czego edytor
 * nie umiałby pokazać.
 *
 * Mapowanie nazwy grupy na `id` zostaje w warstwie danych: grup jeszcze nie
 * ma, bo mają dopiero powstać. Funkcja mówi, KTÓRE utworzyć.
 */

export interface LibraryImportApplyItem {
  /** Pozycja w `proposal.items` — żeby zapis umiał powiedzieć, KTÓRY wiersz już wszedł. */
  index: number;
  name: string;
  description: string;
  /** Dokładna nazwa grupy (istniejącej albo z `categoriesToCreate`); `null` = bez grupy. */
  categoryName: string | null;
  unit: Unit;
  unitLabel: string | null;
  unitPriceCents: number | null;
  minPriceCents: number | null;
  pricing: PricingRule;
}

export interface LibraryImportApplyResult {
  /** Grupy, których biblioteka nie ma — w kolejności pierwszego wystąpienia. */
  categoriesToCreate: string[];
  items: LibraryImportApplyItem[];
  /** Nazwy pominięte, bo biblioteka już je ma (albo propozycja powtarza je sama). */
  duplicates: string[];
}

export interface LibraryImportExisting {
  categoryNames: readonly string[];
  itemNames: readonly string[];
}

/**
 * Klucz porównania nazw: bez spacji na brzegach, bez rozróżniania wielkości
 * liter. Nie usuwamy diakrytyków — „Projekt łazienki" i „Projekt lazienki"
 * to dla użytkownika różne wpisy, nie literówka do scalenia.
 */
function nameKey(name: string): string {
  return name.trim().toLocaleLowerCase('pl-PL');
}

/** Czy biblioteka ma już usługę o tej nazwie (bez wielkości liter i spacji). */
export function isExistingName(name: string, itemNames: readonly string[]): boolean {
  const key = nameKey(name);
  if (!key) return false;
  return itemNames.some((existing) => nameKey(existing) === key);
}

function toSelectionSet(selected: readonly number[] | ReadonlySet<number>): ReadonlySet<number> {
  return selected instanceof Set ? selected : new Set(selected);
}

/**
 * Z propozycji modelu robi listę do zapisu.
 *
 * - `selectedIndexes` — indeksy w `proposal.items`, które użytkownik
 *   zaznaczył. Pozycja spoza zaznaczenia nie trafia nigdzie (ani do
 *   `items`, ani do `duplicates`): odznaczenie to decyzja, nie błąd.
 * - Pozycja o nazwie, którą biblioteka **już ma**, ląduje w `duplicates`
 *   i jest pomijana — chyba że użytkownik zaznaczył ją jawnie, czyli
 *   `selectedIndexes` ją zawiera. UI domyślnie odznacza takie wiersze,
 *   więc „jawnie" znaczy tu „kliknął mimo etykiety «już masz»".
 * - Powtórzenie tej samej nazwy wewnątrz propozycji zostawia pierwsze
 *   wystąpienie; kolejne idą do `duplicates`. Dwie usługi o jednej nazwie
 *   w bibliotece to pułapka przy wstawianiu do wyceny.
 * - `individual` zeruje cenę jednostkową: brak ceny JEST sposobem wyceny
 *   (`pricingChoiceFor` poznaje „indywidualnie" po `null`).
 */
export function applyLibraryImport(
  proposal: LibraryImportProposal,
  selectedIndexes: readonly number[] | ReadonlySet<number>,
  existing: LibraryImportExisting,
): LibraryImportApplyResult {
  const selected = toSelectionSet(selectedIndexes);
  const existingCategories = new Map(
    existing.categoryNames.map((name) => [nameKey(name), name.trim()] as const),
  );

  const items: LibraryImportApplyItem[] = [];
  const duplicates: string[] = [];
  const categoriesToCreate: string[] = [];
  const seenNames = new Set<string>();
  const seenNewCategories = new Set<string>();

  proposal.items.forEach((item, index) => {
    const name = item.name.trim();
    if (!name) return;

    const explicitlySelected = selected.has(index);
    const alreadyInLibrary = isExistingName(name, existing.itemNames);

    if (alreadyInLibrary && !explicitlySelected) {
      duplicates.push(name);
      return;
    }
    if (!explicitlySelected) return;

    const key = nameKey(name);
    if (seenNames.has(key)) {
      duplicates.push(name);
      return;
    }
    seenNames.add(key);

    const requestedCategory = item.categoryName?.trim() || null;
    let categoryName: string | null = null;
    if (requestedCategory) {
      const known = existingCategories.get(nameKey(requestedCategory));
      if (known) {
        categoryName = known;
      } else {
        categoryName = requestedCategory;
        const categoryKey = nameKey(requestedCategory);
        if (!seenNewCategories.has(categoryKey)) {
          seenNewCategories.add(categoryKey);
          categoriesToCreate.push(requestedCategory);
        }
      }
    }

    const { unit, unitLabel } = unitForChoice(item.pricingChoice, item.unitLabel);
    const pricing = pricingRuleForChoice(item.pricingChoice, { mode: 'flat' });
    const unitPriceCents = item.pricingChoice === 'individual' ? null : item.unitPriceCents;

    items.push({
      index,
      name,
      description: item.description.trim(),
      categoryName,
      unit,
      unitLabel,
      unitPriceCents,
      minPriceCents: item.minPriceCents,
      pricing,
    });
  });

  return { categoriesToCreate, items, duplicates };
}
