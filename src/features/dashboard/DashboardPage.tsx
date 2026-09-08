import { useMemo } from 'react';
import { ActiveProjects } from './ActiveProjects';
import { ActivityFeed } from './ActivityFeed';
import { RecentQuotes } from './RecentQuotes';
import { DashboardEmptyState } from './DashboardEmptyState';
import { DashboardPulse } from './DashboardPulse';
import { OnboardingChecklist } from './OnboardingChecklist';
import { pulseNumbers } from './pulse';
import { useActivity } from '@/data/queries/useActivity';
import { useProjects } from '@/data/queries/useProjects';
import { useQuotesList } from '@/data/queries/useQuotes';
import { useWorkspace } from '@/data/queries/useWorkspace';
import { formatLongDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';

const RECENT_COUNT = 5;
/** Tyle samo, ile bierze pasek aktywności — jedno zapytanie w cache'u. */
const ACTIVITY_LIMIT = 6;

/**
 * Pulpit (przebudowany 2026-08-27 w poprawce 6; układ z T-133, 2026-09-08).
 *
 * ## Dlaczego znowu dwie kolumny
 *
 * Po poprawce 6 pulpit był jedną kolumną czterech białych kart tej samej
 * wagi, z tym samym wersalikowym nagłówkiem — i wszystko się zlewało. Wzrok
 * nie miał od czego zacząć. Teraz hierarchia idzie przez **układ**, nie przez
 * kolor: data dnia i cztery liczby „na co czekam" u góry, pod nimi po lewej
 * to, co się dzieje (aktywność klientów, ostatnie wyceny), po prawej to, na
 * czym się pracuje (teczki w toku z okładkami, checklista startowa).
 *
 * Bilans miesiąca NIE wraca — pasek liczy to, co czeka, nie to, co było
 * (patrz `DashboardPulse`). Karta subskrypcji dalej jest w Ustawieniach.
 *
 * ## Kolejność w lewej kolumnie
 *
 * 1. Aktywność klientów — jedyna rzecz na tym ekranie, która może wymagać
 *    reakcji dzisiaj.
 * 2. Ostatnie wyceny.
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

  const numbers = useMemo(
    () =>
      pulseNumbers({
        quotes: rows,
        events: activity.data ?? [],
        projects: projects.data ?? [],
        seenAt: workspace?.settings.activitySeenAt ?? null,
      }),
    [rows, activity.data, projects.data, workspace?.settings.activitySeenAt],
  );

  if (empty) {
    // Świeże konto: zaproszenie na całą szerokość, bez pustych kafli
    // z zerami — zero nie jest informacją, dopóki nie ma czego liczyć.
    return (
      <div className="mx-auto w-full max-w-[900px] space-y-6">
        <DateLine />
        <OnboardingChecklist hasQuotes={false} />
        <DashboardEmptyState />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <DateLine />

      <DashboardPulse numbers={numbers} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ActivityFeed />
          <RecentQuotes
            quotes={rows.slice(0, RECENT_COUNT)}
            loading={loading}
            error={error}
            onRetry={() => void quotes.refetch()}
          />
        </div>

        <aside className="space-y-6">
          {!loading && !error ? <OnboardingChecklist hasQuotes={rows.length > 0} /> : null}
          <ActiveProjects />
        </aside>
      </div>
    </div>
  );
}

/** „wtorek, 8 września 2026" — pulpit jest o dzisiaj, więc mówi, który to dzień. */
function DateLine() {
  return (
    <p className="text-ink-soft text-sm">
      <span className="label-caps">{pl.dashboard.today}</span>
      <span aria-hidden> · </span>
      <span className="font-display text-ink text-[17px]">{formatLongDate(new Date())}</span>
    </p>
  );
}
