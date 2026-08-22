import type { QuoteSummary } from '@/data/repos/quotes.repo';

/**
 * Liczności rozstrzygnięć z bieżącego miesiąca — uzupełnienie
 * `calcDashboardStats` (które zwraca sam ułamek `acceptanceRate`).
 * Pulpit pokazuje odpowiedzi klientów jako „x z y na TAK" z kropkami,
 * więc potrzebuje liczb, nie tylko proporcji.
 *
 * Miesiąc liczony identycznie jak w `stats.ts`: po `createdAt`,
 * w strefie czasowej użytkownika.
 */
export interface SettledCounts {
  accepted: number;
  rejected: number;
  /** accepted + rejected — mianownik wskaźnika akceptacji. */
  settled: number;
}

export function calcSettledCounts(
  quotes: readonly QuoteSummary[],
  now: Date = new Date(),
): SettledCounts {
  let accepted = 0;
  let rejected = 0;

  for (const quote of quotes) {
    const created = new Date(quote.createdAt);
    const sameMonth =
      created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    if (!sameMonth) continue;

    if (quote.status === 'accepted') accepted += 1;
    else if (quote.status === 'rejected') rejected += 1;
  }

  return { accepted, rejected, settled: accepted + rejected };
}
