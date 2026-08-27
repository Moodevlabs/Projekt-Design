import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, MessageSquare, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useActivity } from '@/data/queries/useActivity';
import type { ActivityEvent, ActivityKind } from '@/data/repos/activity.repo';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Ile zdarzeń mieści się na górze pulpitu, zanim przykryje resztę. */
const LIMIT = 6;

const ICONS: Record<ActivityKind, LucideIcon> = {
  accepted: CheckCircle2,
  rejected: XCircle,
  comment: MessageSquare,
  viewed: Eye,
};

const TONES: Record<ActivityKind, string> = {
  accepted: 'text-[var(--status-accepted)]',
  rejected: 'text-[var(--status-rejected)]',
  comment: 'text-[var(--status-sent)]',
  viewed: 'text-ink-soft',
};

/**
 * „Czy jestem na bieżąco" — pierwszy blok pulpitu (poprawka 6, 2026-08-27).
 *
 * ## Po co
 *
 * Do tej pory fakt, że klient przyjął ofertę albo zostawił uwagę, żył
 * **wyłącznie wewnątrz konkretnej wyceny**. Trzeba było wiedzieć, gdzie
 * zajrzeć, żeby się dowiedzieć — czyli wiedzieć to, czego się szuka.
 * Pulpit ma odpowiadać na jedno pytanie: czy coś się wydarzyło, kiedy mnie
 * nie było.
 *
 * ## Dlaczego nie „modal"
 *
 * Okno na starcie trzeba zamknąć, żeby zobaczyć aplikację — i zamyka się je
 * odruchowo, razem z treścią. Pas na górze strony stoi tam, gdzie i tak pada
 * wzrok, i nie wymaga żadnego ruchu, gdy nic się nie zmieniło: wtedy mówi
 * jednym zdaniem, że jest cicho.
 */
export function ActivityFeed() {
  const activity = useActivity(LIMIT);
  const rows = activity.data ?? [];
  const unread = rows.filter((event) => event.unread).length;

  if (activity.isLoading) {
    return (
      <section className="card-surface mb-6 space-y-3 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-full" />
      </section>
    );
  }

  // Błędu tu NIE pokazujemy jako alertu. Pasek jest dodatkiem do pulpitu,
  // a nie jego treścią — czerwone pudełko za nieudane zapytanie o
  // powiadomienia wyglądałoby jak awaria aplikacji.
  if (activity.isError) return null;

  return (
    <section className="card-surface mb-6 p-5" aria-label={pl.dashboard.activityTitle}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label-caps text-ink-soft">{pl.dashboard.activityTitle}</h2>
        <p className={cn('text-xs', unread > 0 ? 'text-ink' : 'text-ink-soft')}>
          {unread > 0 ? pl.dashboard.activityUnread(unread) : pl.dashboard.activityUpToDate}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.dashboard.activityEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((event) => (
            <ActivityRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const Icon = ICONS[event.kind];
  const quoteLabel = [event.quoteNumber, event.quoteTitle].filter(Boolean).join(' · ');

  return (
    <li className="border-hair border-b last:border-0">
      <Link
        to={routes.quote(event.quoteId)}
        className="hover:bg-surface-2/60 -mx-2 flex items-start gap-3 rounded-[var(--radius-control)] px-2 py-2.5 transition-colors"
      >
        <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[event.kind])} aria-hidden />

        <span className="min-w-0 flex-1">
          <span className="text-ink block text-sm">
            {headline(event)}
            {/*
              Kropka przy nieprzeczytanej uwadze, a nie pogrubienie całego
              wiersza: pogrubienie krzyczy tym samym głosem co nagłówek,
              a to jest informacja o stanie jednego wpisu.
            */}
            {event.unread ? (
              <span
                aria-label={pl.dashboard.activityUnreadMark}
                className="ml-2 inline-block size-1.5 rounded-full align-middle"
                style={{ background: 'var(--status-sent)' }}
              />
            ) : null}
          </span>
          <span className="text-ink-soft block truncate text-xs">{quoteLabel}</span>
          {event.message ? (
            <span className="text-ink-soft mt-0.5 block truncate text-xs italic">
              „{event.message}"
            </span>
          ) : null}
        </span>

        <span className="text-ink-soft shrink-0 text-xs whitespace-nowrap">
          {formatRelativeDay(event.at)}
        </span>
      </Link>
    </li>
  );
}

/** Zdanie zdarzenia — podmiotem jest klient, bo to on coś zrobił. */
function headline(event: ActivityEvent): string {
  const who = event.who || event.clientName || pl.dashboard.activitySomeone;

  switch (event.kind) {
    case 'accepted':
      return pl.dashboard.activityAccepted(who);
    case 'rejected':
      return pl.dashboard.activityRejected(who);
    case 'comment':
      return pl.dashboard.activityComment(who);
    case 'viewed':
      return pl.dashboard.activityViewed(event.clientName || pl.dashboard.activitySomeone);
  }
}
