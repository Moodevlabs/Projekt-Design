import { isPreviewableImage, type StoredFile } from '../files/schema';
import { ProjectKindSchema, type ProjectKind } from './schema';

/**
 * Okładka projektu (T-130): skąd bierze się kadr na karcie, w liście
 * i na pulpicie.
 *
 * Trzy źródła, w tej kolejności:
 *  1. plik wybrany ręcznie (`coverFileId`),
 *  2. najnowszy obraz wśród plików projektu,
 *  3. placeholder — rysunek według typu inwestycji.
 *
 * Widok `projects_overview` liczy 1 i 2 po stronie bazy (`coverPath`), żeby
 * lista nie robiła N+1 zapytań o pliki. Karta projektu ma pliki pod ręką,
 * więc liczy to samo z listy — `latestImage` — i musi dawać ten sam wynik,
 * co SQL (ten sam warunek „obraz": MIME albo rozszerzenie).
 */

/** Typ, dla którego mamy rysunek. Nieznany / pusty `kind` → `other`. */
export function placeholderKind(kind: string): ProjectKind {
  const parsed = ProjectKindSchema.safeParse(kind);
  return parsed.success ? parsed.data : 'other';
}

/** Obrazy projektu, najnowszy pierwszy — do miniatur pod kadrem. */
export function projectImages(files: readonly StoredFile[]): StoredFile[] {
  return files
    .filter((file) => file.deletedAt === null && isPreviewableImage(file.mime, file.name))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Najnowszy obraz — to, co widok bierze na okładkę bez ręcznego wyboru. */
export function latestImage(files: readonly StoredFile[]): StoredFile | null {
  return projectImages(files)[0] ?? null;
}

export type CoverSource = 'chosen' | 'auto' | 'placeholder';

/**
 * Plik na kadr karty projektu i skąd pochodzi. `chosen` tylko wtedy, gdy
 * wybrany plik nadal istnieje i jest obrazem — skasowany albo podmieniony
 * na PDF wraca do automatu, zamiast zostawić pusty kadr.
 */
export function resolveCover(
  coverFileId: string | null,
  files: readonly StoredFile[],
): { file: StoredFile | null; source: CoverSource } {
  const chosen = coverFileId
    ? (projectImages(files).find((f) => f.id === coverFileId) ?? null)
    : null;
  if (chosen) return { file: chosen, source: 'chosen' };
  const auto = latestImage(files);
  if (auto) return { file: auto, source: 'auto' };
  return { file: null, source: 'placeholder' };
}
