/**
 * Budowanie warunków `or(...)` PostgREST-a.
 *
 * Wartość idzie **w cudzysłowie**, a nie z odkreślonymi przecinkami: `,` i `)`
 * rozdzielają warunki w drzewie logicznym, a backslash **nie jest** tam
 * znakiem ucieczki. Bez cudzysłowu fraza „Kowalski, Jan" rozpada się na dwa
 * warunki i PostgREST odpowiada `failed to parse logic tree` — czyli wyszukanie
 * zwraca błąd zamiast wyników. W cudzysłowie uciekać trzeba już tylko przed
 * `"` i `\`.
 *
 * Wycinanie tych znaków z frazy odpada: „Kowalski, Jan" to nazwa, którą
 * człowiek widzi na ekranie i ma prawo w nią wpisać.
 *
 * Helper stoi osobno, bo ten sam błąd był w czterech repozytoriach naraz
 * (T-53 naprawił klientów i projekty, T-17 wyceny i bibliotekę). Cztery kopie
 * jednego cytowania to cztery okazje, żeby piąte wyszukiwanie znów je zgubiło.
 */

/** Warunek `ilike` dla jednej kolumny. */
export function ilikeFilter(column: string, term: string): string {
  const escaped = term.replace(/["\\]/g, (znak) => '\\' + znak);
  return `${column}.ilike."%${escaped}%"`;
}

/** Argument do `query.or(...)`: fraza szukana w kilku kolumnach naraz. */
export function ilikeAnyOf(columns: string[], term: string): string {
  return columns.map((column) => ilikeFilter(column, term)).join(',');
}
