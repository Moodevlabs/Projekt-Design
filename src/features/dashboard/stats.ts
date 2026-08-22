import type { QuoteSummary } from '@/data/repos/quotes.repo';

/**
 * Statystyki kafli na pulpicie (05-UI §3). Czysta funkcja — liczona z listy,
 * ktora i tak jest w cache, wiec nie potrzebujemy osobnego zapytania.
 *
 * WSZYSTKIE cztery liczby dotycza **biezacego miesiaca kalendarzowego**
 * (wg `created_at`), bo tak sa podpisane kafle. Miesiac liczymy w strefie
 * uzytkownika, a nie w UTC — dla kogos w Polsce wycena z 31.08 o 23:00 UTC
 * nalezy juz do wrzesnia, i tak ma byc. Jesli kiedys kafel ma pokazywac
 * cos innego niz miesiac, zmien tez etykiete w `i18n/pl.ts`.
 */
export interface DashboardStats {
  /** Liczba wycen utworzonych w tym miesiacu. */
  quotesThisMonth: number;
  /** Suma netto wycen, ktore wyszly do klienta (sent/accepted) w tym miesiacu. */
  sentValueCents: number;
  /**
   * Odsetek zaakceptowanych sposrod **rozstrzygnietych** (accepted + rejected).
   * Szkice i wyceny wciaz „w grze" (sent) nie licza sie do mianownika — inaczej
   * wskaznik spadalby tylko dlatego, ze ktos wyslal swieza oferte.
   * `null`, gdy nie ma jeszcze zadnej rozstrzygnietej wyceny.
   */
  acceptanceRate: number | null;
  /** Srednia wartosc netto wyceny utworzonej w tym miesiacu (0 przy braku). */
  averageValueCents: number;
}

const OUT_OF_DOOR = new Set(['sent', 'accepted']);

function isSameMonth(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function calcDashboardStats(
  quotes: readonly QuoteSummary[],
  now: Date = new Date(),
): DashboardStats {
  const thisMonth = quotes.filter((quote) => isSameMonth(quote.createdAt, now));

  const sentValueCents = thisMonth
    .filter((quote) => OUT_OF_DOOR.has(quote.status))
    .reduce((sum, quote) => sum + quote.totalNetCents, 0);

  const settled = thisMonth.filter(
    (quote) => quote.status === 'accepted' || quote.status === 'rejected',
  );
  const accepted = settled.filter((quote) => quote.status === 'accepted').length;

  const totalValue = thisMonth.reduce((sum, quote) => sum + quote.totalNetCents, 0);

  return {
    quotesThisMonth: thisMonth.length,
    sentValueCents,
    acceptanceRate: settled.length === 0 ? null : accepted / settled.length,
    averageValueCents: thisMonth.length === 0 ? 0 : Math.round(totalValue / thisMonth.length),
  };
}
