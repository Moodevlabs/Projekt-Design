import { pl } from '@/i18n/pl';

/**
 * Typ inwestycji po polsku.
 *
 * Baza dopuszcza własny tekst (`kind` to zwykły `text`), więc nieznana wartość
 * wraca **dosłownie** — podmiana na „Inny" ukryłaby to, co ktoś świadomie
 * wpisał. Osobny plik, żeby `ProjectsTable` eksportował same komponenty
 * i nie tracił Fast Refresh.
 */
export function kindLabel(kind: string): string {
  return kind in pl.projects.kinds
    ? pl.projects.kinds[kind as keyof typeof pl.projects.kinds]
    : kind;
}
