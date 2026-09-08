import type { QuoteSummary } from '@/data/repos/quotes.repo';
import type { ActivityEvent } from '@/data/repos/activity.repo';
import type { ProjectOverview } from '@/domain/project/schema';
import { EXPIRING_DAYS, type PulseNumbers } from './DashboardPulse';

/**
 * Liczby paska „na co dziś czekam" — czysta funkcja, żeby dało się ją
 * sprawdzić bez renderowania pulpitu.
 *
 * `seenAt` to znacznik „przejrzane" z ustawień workspace'u (ten sam, którego
 * używa pasek aktywności): zdarzeniem NOWYM jest to, które przyszło po nim,
 * albo nieprzeczytana uwaga niezależnie od znacznika.
 */
export function pulseNumbers(args: {
  quotes: readonly QuoteSummary[];
  events: readonly ActivityEvent[];
  projects: readonly ProjectOverview[];
  seenAt: string | null;
  now?: Date;
}): PulseNumbers {
  const now = args.now ?? new Date();
  const horizon = new Date(now.getTime() + EXPIRING_DAYS * 24 * 60 * 60 * 1000);

  const sentQuotes = args.quotes.filter((quote) => quote.status === 'sent');

  const expiring = sentQuotes.filter((quote) => {
    if (!quote.validUntil) return false;
    const until = new Date(quote.validUntil);
    return until >= now && until <= horizon;
  }).length;

  const events = args.events.filter(
    (event) => event.unread || args.seenAt === null || event.at > args.seenAt,
  ).length;

  const projects = args.projects.filter(
    (project) => project.status !== 'done' && project.status !== 'canceled',
  ).length;

  return { events, sent: sentQuotes.length, expiring, projects };
}
