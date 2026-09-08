import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Bell, FolderOpen, Hourglass, Send } from 'lucide-react';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Ile dni przed końcem ważności oferta trafia do kafla „wygasają". */
export const EXPIRING_DAYS = 7;

export interface PulseNumbers {
  /** Nieprzeczytane uwagi + nowe zdarzenia od ostatniego „przejrzane". */
  events: number;
  /** Oferty ze statusem „Wysłana" — czekają na decyzję inwestora. */
  sent: number;
  /** Wysłane, którym ważność kończy się w ciągu `EXPIRING_DAYS` dni. */
  expiring: number;
  /** Teczki w toku (zapytanie, oferta, realizacja). */
  projects: number;
}

/**
 * Pasek „na co dziś czekam" (T-133) — cztery liczby nad resztą pulpitu.
 *
 * To NIE jest bilans miesiąca, który zniknął w poprawce 6: tamten liczył, co
 * się wydarzyło (utworzone, wysłane, średnia), a te cztery mówią, co
 * **czeka** — na reakcję pracowni albo na decyzję inwestora. Każda liczba
 * jest odpowiedzią na pytanie, które ktoś zadaje rano: czy coś przyszło,
 * ile ofert leży u klientów, które zaraz wygasną, ile teczek jest otwartych.
 *
 * Kafel z liczbą większą od zera i wymagający reakcji (zdarzenia,
 * wygasające) dostaje kropkę w kolorze statusu — struktura niesie
 * informację, barwa ją wzmacnia (zasada `StatusMark`).
 */
export function DashboardPulse({ numbers }: { numbers: PulseNumbers }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={pl.dashboard.pulseTitle}>
      <Tile
        icon={Bell}
        label={pl.dashboard.pulseEvents}
        value={numbers.events}
        hint={numbers.events > 0 ? pl.dashboard.pulseEventsHint : pl.dashboard.activityUpToDate}
        attention={numbers.events > 0}
        tone="var(--status-sent)"
      />
      <Tile
        icon={Send}
        label={pl.dashboard.pulseSent}
        value={numbers.sent}
        hint={pl.dashboard.pulseSentHint}
        to={routes.quotes}
      />
      <Tile
        icon={Hourglass}
        label={pl.dashboard.pulseExpiring}
        value={numbers.expiring}
        hint={pl.dashboard.pulseExpiringHint(EXPIRING_DAYS)}
        attention={numbers.expiring > 0}
        tone="var(--warning)"
        to={routes.quotes}
      />
      <Tile
        icon={FolderOpen}
        label={pl.dashboard.pulseProjects}
        value={numbers.projects}
        hint={pl.dashboard.pulseProjectsHint}
        to={routes.clients}
      />
    </ul>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  attention = false,
  tone,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  attention?: boolean;
  tone?: string;
  to?: string;
}) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="label-caps text-ink-soft">{label}</span>
        <Icon className="text-ink-faint size-4" aria-hidden />
      </span>
      <span className="mt-2 flex items-baseline gap-2">
        <span className="text-ink text-[26px] leading-none font-semibold tabular-nums">
          {value}
        </span>
        {attention ? (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: tone ?? 'var(--status-sent)' }}
          />
        ) : null}
      </span>
      <span className="text-ink-soft mt-1.5 block truncate text-xs">{hint}</span>
    </>
  );

  const className = cn(
    'card-surface flex h-full flex-col px-5 py-4',
    to &&
      'hover:border-ink/20 focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none',
  );

  return (
    <li className="min-w-0">
      {to ? (
        <Link to={to} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </li>
  );
}
