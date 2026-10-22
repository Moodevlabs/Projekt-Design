/**
 * Placeholdery w tekstach oferty (`{rooms}`, `{frames|kadr|kadry|kadrów}` …)
 * — ten sam zbiór, który rozwija `quote/template-text.ts`.
 *
 * Dopracowany tekst (T-139) musi je zachować co do znaku: `{rooms}` to nie
 * ozdobnik, tylko lista pomieszczeń, która sama nadąża za zakresem. Model
 * dostaje polecenie, a domena sprawdza wynik — polecenie to prośba, test to
 * gwarancja.
 */

const PLACEHOLDER = /\{[a-zA-Z]+(?:\|[^}]*)?\}/g;

/** Unikalne placeholdery w kolejności pierwszego wystąpienia. */
export function placeholdersIn(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) seen.add(match[0]);
  return [...seen];
}

/** Czy `after` zachował każdy placeholder z `before`. */
export function placeholdersKept(before: string, after: string): boolean {
  const kept = new Set(placeholdersIn(after));
  return placeholdersIn(before).every((token) => kept.has(token));
}

export interface PolishOutcome {
  ok: boolean;
  text: string;
  /** Placeholdery, które zginęły — do komunikatu. */
  lost: string[];
}

/**
 * Nakłada propozycję modelu na pole: odrzuca, gdy zgubiła placeholder,
 * przycina do limitu długości, zwraca tekst gotowy do wpisania.
 */
export function applyPolishedText(
  before: string,
  proposal: string,
  maxLength = 1200,
): PolishOutcome {
  const text = proposal.trim().slice(0, maxLength);
  const lost = placeholdersIn(before).filter((token) => !text.includes(token));
  return { ok: lost.length === 0 && text.length > 0, text, lost };
}
