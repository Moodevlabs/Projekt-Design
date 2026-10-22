import { isExistingName, type LibraryImportItem, type LibraryImportProposal } from '@/domain/ai';

/**
 * Wiersz tabeli propozycji — kopia pozycji z propozycji plus stan zaznaczenia.
 *
 * `index` wskazuje na pierwotną pozycję w `proposal.items`: to on idzie do
 * `applyLibraryImport` jako „zaznaczony", więc musi przeżyć sortowanie
 * i edycję nazwy.
 */
export interface ProposalRow {
  index: number;
  item: LibraryImportItem;
  selected: boolean;
  /** Biblioteka ma już usługę o tej nazwie — etykieta „już masz", domyślnie odznaczone. */
  alreadyHave: boolean;
}

/**
 * Wiersze z propozycji. Pozycje `low` są zaznaczone (FEATURES-AI §2: „domyślnie
 * zaznaczone, ale podświetlone"), duplikaty odznaczone — jedno i drugie da się
 * odwrócić kliknięciem.
 */
export function rowsFromProposal(
  proposal: LibraryImportProposal,
  existingNames: readonly string[],
): ProposalRow[] {
  return proposal.items.map((item, index) => {
    const alreadyHave = isExistingName(item.name, existingNames);
    return { index, item, selected: !alreadyHave, alreadyHave };
  });
}

/** Propozycja złożona z aktualnych (edytowanych) wierszy — wejście do `applyLibraryImport`. */
export function proposalFromRows(
  original: LibraryImportProposal,
  rows: readonly ProposalRow[],
): LibraryImportProposal {
  const items = [...original.items];
  for (const row of rows) items[row.index] = row.item;
  return { ...original, items };
}

/** Nazwy nowych grup, które propozycja wnosi — do listy w selekcie grupy. */
export function proposedNewCategories(
  rows: readonly ProposalRow[],
  existingNames: readonly string[],
): string[] {
  const known = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase('pl-PL')));
  const out: string[] = [];
  for (const row of rows) {
    const name = row.item.categoryName?.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('pl-PL');
    if (known.has(key)) continue;
    known.add(key);
    out.push(name);
  }
  return out;
}
