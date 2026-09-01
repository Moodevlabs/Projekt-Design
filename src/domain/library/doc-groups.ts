import { z } from 'zod';
import { LIBRARY_COLORS } from './schema';
import {
  DocLibraryKindSchema,
  parseDocLibraryPayload,
  type DocLibraryKind,
  type DocLibraryPayloadByKind,
} from './doc-entries';

/**
 * Grupy i zestawy bibliotek dokumentów (T-121).
 *
 * Usługi mają oba byty od T-59; termin, etapy współpracy i cennik dodatkowy
 * dostają je tutaj, w tym samym kształcie i tym samym słownictwem:
 *  - **Grupa** (`library_doc_categories`) porządkuje wpisy — wpis wskazuje ją
 *    przez `category_id`, więc przypisanie to edycja wpisu, nie kopia;
 *  - **Zestaw** (`library_doc_sets`) niesie SNAPSHOT payloadów, więc zostaje
 *    taki, jaki był w chwili złożenia, nawet gdy wpis źródłowy się zmieni.
 *
 * Paleta kolorów jest **wspólna z grupami usług** (`LIBRARY_COLORS`) —
 * biblioteka ma wyglądać jak jedna biblioteka, a nie jak dwie obok siebie.
 */

export const DocLibraryCategorySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  kind: DocLibraryKindSchema,
  name: z.string().min(1),
  /** Prefiks na liście, np. „01". Puste = studio nie numeruje etapów. */
  code: z.string().default(''),
  color: z.enum(LIBRARY_COLORS).nullable().default(null),
  sortOrder: z.number().int().default(0),
  isSample: z.boolean().default(false),
});
export type DocLibraryCategory = z.infer<typeof DocLibraryCategorySchema>;

/**
 * Zestaw wpisów dokumentu.
 *
 * `items` jest typowane po rodzaju, więc nie da się wsadzić etapu terminu do
 * zestawu cennika — tak samo jak w bazie pilnuje tego złożony klucz obcy
 * `(category_id, kind)`.
 */
export interface DocLibrarySet<K extends DocLibraryKind = DocLibraryKind> {
  id: string;
  workspaceId: string;
  kind: K;
  name: string;
  items: DocLibraryPayloadByKind[K][];
  sortOrder: number;
  isSample: boolean;
}

/**
 * Miękkie parsowanie zawartości zestawu z `jsonb`.
 *
 * Ta sama zasada co przy `parseDocLibraryPayload`: jeden uszkodzony element
 * nie ma prawa wywalić całego zestawu ani sekcji biblioteki. Element, którego
 * nie da się odczytać, **wypada** — zestaw pokazuje resztę i mniejszy licznik,
 * zamiast białej strony. Zwracamy nową tablicę, nigdy `null`.
 */
export function parseDocLibrarySetItems<K extends DocLibraryKind>(
  kind: K,
  raw: unknown,
): DocLibraryPayloadByKind[K][] {
  if (!Array.isArray(raw)) return [];

  const out: DocLibraryPayloadByKind[K][] = [];
  for (const candidate of raw) {
    const parsed = parseDocLibraryPayload(kind, candidate);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Etykieta grupy na liście: „01 · Koncepcja" albo sama nazwa.
 *
 * Osobna funkcja od `categoryLabel` z `schema.ts` mimo identycznego ciała —
 * tamta bierze `LibraryCategory` (grupa usług), ta `DocLibraryCategory`.
 * Wspólna funkcja generyczna po `Pick<…, 'code' | 'name'>` byłaby tańsza
 * o cztery linie i droższa o jedno pytanie „czyją grupę to właściwie opisuje".
 */
export function docCategoryLabel(category: Pick<DocLibraryCategory, 'code' | 'name'>): string {
  return category.code ? `${category.code} · ${category.name}` : category.name;
}
