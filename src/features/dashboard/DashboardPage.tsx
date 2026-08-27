import { useMemo } from 'react';
import { ActiveProjects } from './ActiveProjects';
import { ActivityFeed } from './ActivityFeed';
import { RecentQuotes } from './RecentQuotes';
import { DashboardEmptyState } from './DashboardEmptyState';
import { OnboardingChecklist } from './OnboardingChecklist';
import { useQuotesList } from '@/data/queries/useQuotes';

const RECENT_COUNT = 5;

/**
 * Pulpit (przebudowany 2026-08-27, poprawka 6).
 *
 * ## Co się zmieniło i dlaczego
 *
 * Zniknął **bilans miesiąca** z prawej szyny. Liczył wyceny utworzone,
 * wysłane i rozstrzygnięte w bieżącym miesiącu — dane prawdziwe, ale
 * niebędące odpowiedzią na żadne pytanie, które ktoś rano zadaje. Pracownia
 * projektowa nie rozlicza się z miesiąca; rozlicza się z tego, na co czeka
 * klient. Razem z nim zniknęła karta subskrypcji: jej miejsce jest
 * w ustawieniach, a okres próbny zgłasza się sam, raz, przy starcie
 * (`TrialDialog`).
 *
 * ## Co zostało i w jakiej kolejności
 *
 * 1. **Co nowego u klientów** — akceptacje, odrzucenia, uwagi, otwarte linki.
 *    Na samej górze, bo to jedyna rzecz na tym ekranie, która może wymagać
 *    reakcji dzisiaj.
 * 2. Teczki w toku.
 * 3. Ostatnie wyceny.
 *
 * Jedna kolumna, nie dwie: po usunięciu szyny prawa kolumna byłaby pustym
 * pasem, a treść zwężona bez powodu.
 */
export function DashboardPage() {
  const quotes = useQuotesList({ sort: 'updated_desc' });
  const rows = useMemo(() => quotes.data ?? [], [quotes.data]);

  const loading = quotes.isLoading;
  const error = quotes.isError;
  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="mx-auto w-full max-w-[900px]">
      {/*
        Pasek zdarzeń stoi NAD checklistą startową: nawet na świeżym koncie
        pierwsze otwarcie linku przez klienta jest ważniejsze niż przypomnienie
        o wgraniu logo.
      */}
      {!empty ? <ActivityFeed /> : null}

      {!loading && !error ? <OnboardingChecklist hasQuotes={rows.length > 0} /> : null}

      <ActiveProjects />

      {empty ? (
        <DashboardEmptyState />
      ) : (
        <RecentQuotes
          quotes={rows.slice(0, RECENT_COUNT)}
          loading={loading}
          error={error}
          onRetry={() => void quotes.refetch()}
        />
      )}
    </div>
  );
}
