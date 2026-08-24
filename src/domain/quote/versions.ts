import type { QuoteStatus } from './schema';

/**
 * Wersje wycen (W1, T-57).
 *
 * Wersjonowanie jest **lekkie** (decyzja D7): linia wersji i numer kolejny,
 * bez historii zmian dokumentu. „v2" znaczy „druga propozycja dla tej samej
 * inwestycji", a nie „drugi zapis tego pliku".
 */

/** Etykieta wersji przy numerze: `WYC/2026/08/0012 · v2`. */
export function versionLabel(version: number): string {
  return `v${version}`;
}

/**
 * Czy wersję w ogóle warto pokazywać.
 *
 * v1 to zdecydowana większość wycen i dopisywanie „· v1" przy każdej byłoby
 * szumem — badge pojawia się dopiero wtedy, gdy niesie informację.
 */
export function showsVersion(version: number): boolean {
  return version > 1;
}

/**
 * Co się dzieje z poprzednią wersją po założeniu nowej.
 *
 * Szkic idzie do archiwum: był roboczą propozycją, którą właśnie zastąpiono.
 * `sent`, `accepted` i `rejected` **zostają** — to fakty o tym, co poszło do
 * inwestora i jak odpowiedział (koncepcja §4 reguła 2). Przepisanie ich na
 * `archived` skasowałoby historię, której nie da się odtworzyć.
 */
export function statusAfterSuperseding(previous: QuoteStatus): QuoteStatus | null {
  return previous === 'draft' ? 'archived' : null;
}

/**
 * Czy z tej wyceny można zrobić nową wersję.
 *
 * Nie da się z archiwalnej: linia poszła dalej i nowa wersja z odgałęzienia
 * dałaby dwie „najnowsze" o tym samym numerze. Nowa wersja powstaje z tej,
 * która jest aktualną propozycją.
 */
export function canCreateVersion(status: QuoteStatus): boolean {
  return status !== 'archived';
}

/**
 * Numer nowej wersji w linii.
 *
 * Bierzemy `max + 1`, a nie `liczba wersji + 1`: usunięcie wersji ze środka
 * linii nie ma prawa spowodować, że numer się powtórzy.
 */
export function nextVersion(versionsInLineage: readonly number[]): number {
  if (versionsInLineage.length === 0) return 1;
  return Math.max(...versionsInLineage) + 1;
}

export interface VersionedRow {
  id: string;
  lineageId: string;
  version: number;
}

export interface VersionGroup<T extends VersionedRow> {
  lineageId: string;
  /** Najnowsza wersja w linii — to ona jest wierszem głównym listy. */
  latest: T;
  /** Starsze wersje, od najnowszej. Puste dla linii jednowersyjnej. */
  older: T[];
}

/**
 * Grupowanie listy wycen po linii wersji.
 *
 * Lista projektu i rejestr pokazują **jeden wiersz na linię** (najnowsza
 * wersja), a starsze chowają się w rozwinięciu. Bez tego projekt z trzema
 * podejściami wyglądałby jak projekt z trzema ofertami.
 *
 * Kolejność linii idzie za kolejnością wejściową — sortowanie robi baza
 * i nie ma powodu, żeby je tu przestawiać.
 */
export function groupByLineage<T extends VersionedRow>(rows: readonly T[]): VersionGroup<T>[] {
  const groups = new Map<string, T[]>();

  for (const row of rows) {
    const bucket = groups.get(row.lineageId);
    if (bucket) bucket.push(row);
    else groups.set(row.lineageId, [row]);
  }

  return [...groups.values()].map((wersje) => {
    const posortowane = [...wersje].sort((a, b) => b.version - a.version);
    // `posortowane` ma co najmniej jeden element — grupa powstaje z wiersza.
    const [latest, ...older] = posortowane as [T, ...T[]];
    return { lineageId: latest.lineageId, latest, older };
  });
}
