import { useMemo } from 'react';
import { RecentQuotes } from './RecentQuotes';
import { MonthLedger } from './MonthLedger';
import { DashboardEmptyState } from './DashboardEmptyState';
import { SubscriptionCard } from './SubscriptionCard';
import { calcDashboardStats } from './stats';
import { calcSettledCounts } from './settled';
import { useQuotesList } from '@/data/queries/useQuotes';

const RECENT_COUNT = 5;

/**
 * Pulpit dziedziczy anatomię edytora wyceny: praca (lista) po lewej,
 * osiadająca suma — bilans miesiąca — w prawej szynie, pod nią subskrypcja.
 * Jedno zapytanie zasila i bilans, i listę; statystyki liczymy z cache.
 */
export function DashboardPage() {
  const quotes = useQuotesList({ sort: 'updated_desc' });
  const rows = useMemo(() => quotes.data ?? [], [quotes.data]);
  const stats = useMemo(() => calcDashboardStats(rows), [rows]);
  const settled = useMemo(() => calcSettledCounts(rows), [rows]);

  const loading = quotes.isLoading;
  const error = quotes.isError;
  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
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

      <div className="space-y-6">
        {!empty && !error ? (
          <MonthLedger stats={stats} settled={settled} loading={loading} />
        ) : null}
        <SubscriptionCard />
      </div>
    </div>
  );
}
