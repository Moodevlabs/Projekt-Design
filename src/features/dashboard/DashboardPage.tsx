import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ActiveProjects } from './ActiveProjects';
import { ActivityFeed } from './ActivityFeed';
import { RecentQuotes } from './RecentQuotes';
import { DashboardEmptyState } from './DashboardEmptyState';
import { OnboardingChecklist } from './OnboardingChecklist';
import { dashboardCounts, ledeSegments } from './lede';
import { useActivity } from '@/data/queries/useActivity';
import { useProjects } from '@/data/queries/useProjects';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { formatLongDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const RECENT_COUNT = 5;
/** Tyle samo, ile bierze rejestr aktywności — jedno zapytanie w cache'u. */
const ACTIVITY_LIMIT = 6;

/**
 * Pulpit (poprawka 6, 2026-08-27; układ z T-133, 2026-09-08).
 *
 * ## Co się zmieniło i dlaczego
 *
 * Po poprawce 6 pulpit był kolumną czterech białych kart tej samej wagi,
 * każda z tym samym wersalikowym nagłówkiem — wszystko się zlewało. Druga
 * próba (kafle z liczbami i ikonami, pigułki) wyglądała jak każdy inny
 * dashboard. Ta wersja mówi to, co pracownia chce wiedzieć rano, **zdaniem**:
 * „Trzy oferty czekają na decyzję inwestorów, jedna z nich wygasa w czwartek.
 * Dwie nowe uwagi od klientów." — z odnośnikami w treści, bez kafli.
 *
 * Pod zdaniem: po lewej rejestr aktywności klientów wprost na kanwie (bez
 * karty — to lista, nie obiekt), po prawej projekty w toku jako siatka
 * okładek (obraz pierwszy). Na dole jedna biała kartka: prawdziwa tabela
 * ostatnich wycen. Trzy różne kształty dla trzech różnych rzeczy.
 *
 * Bilans miesiąca i karta subskrypcji NIE wracają (poprawka 6).
 */
export function DashboardPage() {
  const quotes = useQuotesList({ sort: 'updated_desc' });
  const activity = useActivity(ACTIVITY_LIMIT);
  const projects = useProjects();
  const workspace = useWorkspace().data;
  const rows = useMemo(() => quotes.data ?? [], [quotes.data]);

  const loading = quotes.isLoading;
  const error = quotes.isError;
  const empty = !loading && !error && rows.length === 0;

  const segments = useMemo(
    () =>
      ledeSegments(
        dashboardCounts({
          quotes: rows,
          events: activity.data ?? [],
          projects: projects.data ?? [],
          seenAt: workspace?.settings.activitySeenAt ?? null,
        }),
      ),
    [rows, activity.data, projects.data, workspace?.settings.activitySeenAt],
  );

  if (empty) {
    // Świeże konto: zaproszenie zamiast zdania o niczym.
    return (
      <div className="mx-auto w-full max-w-[900px] space-y-6">
        <p className="text-ink-soft text-[13px]">{formatLongDate(new Date())}</p>
        <OnboardingChecklist hasQuotes={false} />
        <DashboardEmptyState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1160px]">
      <p className="text-ink-soft text-[13px]">{formatLongDate(new Date())}</p>
      {/* Krój display bez klasy wagi — Faculty Glyphic ma jedną (05-UI §1). */}
      <p
        className="font-display text-ink mt-2 max-w-[46ch] text-[24px] leading-[1.3] text-balance"
        aria-label={pl.dashboard.ledeLabel}
      >
        {segments.map((segment, index) =>
          segment.to ? (
            <Link
              key={index}
              to={segment.to}
              className="decoration-hair-strong hover:decoration-ink underline decoration-[1px] underline-offset-[5px]"
            >
              {segment.text}
            </Link>
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </p>

      {!loading && !error ? (
        <div className="mt-5">
          <OnboardingChecklist hasQuotes={rows.length > 0} />
        </div>
      ) : null}

      <div className="mt-9 grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ActivityFeed />
        <ActiveProjects />
      </div>

      <div className="mt-10">
        <RecentQuotes
          quotes={rows.slice(0, RECENT_COUNT)}
          loading={loading}
          error={error}
          onRetry={() => void quotes.refetch()}
        />
      </div>
    </div>
  );
}
