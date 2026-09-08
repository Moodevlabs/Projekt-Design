import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SectionHead } from './SectionHead';
import { useActivity } from '@/data/queries/useActivity';
import { useUpdateWorkspaceSettings, useWorkspace } from '@/data/queries/useWorkspace';
import type { ActivityEvent, ActivityKind } from '@/data/repos/activity.repo';
import { routes } from '@/app/routes';
import { formatRelativeDay } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Ile zdarzeń mieści się na górze pulpitu, zanim przykryje resztę. */
const LIMIT = 6;

/**
 * Kreska z lewej strony nowego wiersza — w kolorze statusu, który zdarzenie
 * nadaje ofercie. To jedyna barwa w rejestrze; przejrzane wiersze jej nie
 * mają (i są przygaszone), więc kolor niesie stan, a nie dekorację.
 */
const BAR: Record<ActivityKind, string> = {
  accepted: 'var(--status-accepted)',
  rejected: 'var(--status-rejected)',
  comment: 'var(--status-sent)',
  viewed: 'var(--hair-strong)',
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
  const workspace = useWorkspace().data;
  const updateSettings = useUpdateWorkspaceSettings();
  const [showOlder, setShowOlder] = useState(false);

  const all = activity.data ?? [];
  const seenAt = workspace?.settings.activitySeenAt ?? null;

  /*
   * Podział na „nowe" i „odhaczone" liczymy po znaczniku czasu, a nie po
   * fladze na wierszu: zdarzenia przychodzą z trzech różnych tabel i tylko
   * uwaga ma własne `read_at`. Jeden znacznik na workspace obsługuje
   * wszystkie trzy rodzaje i nie wymaga zapisu przy każdym wierszu.
   */
  const fresh = seenAt ? all.filter((event) => event.at > seenAt) : all;
  const older = seenAt ? all.filter((event) => event.at <= seenAt) : [];
  const rows = showOlder ? all : fresh;
  const unread = fresh.filter((event) => event.unread).length;

  const clear = () => {
    if (!workspace) return;
    // Znacznik bierzemy z NAJNOWSZEGO zdarzenia, nie z `now()`. Zdarzenie,
    // które przyszło w trakcie patrzenia na listę, ale jeszcze się nie
    // dociągnęło, zostałoby odhaczone bez pokazania.
    const newest = all[0]?.at ?? new Date().toISOString();
    updateSettings.mutate(
      { ...workspace.settings, activitySeenAt: newest },
      {
        onSuccess: () => {
          setShowOlder(false);
          toast.success(pl.dashboard.activityCleared);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (activity.isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </section>
    );
  }

  // Błędu tu NIE pokazujemy jako alertu. Pasek jest dodatkiem do pulpitu,
  // a nie jego treścią — czerwone pudełko za nieudane zapytanie o
  // powiadomienia wyglądałoby jak awaria aplikacji.
  if (activity.isError) return null;

  return (
    <section aria-label={pl.dashboard.activityTitle}>
      <SectionHead
        title={pl.dashboard.activityTitle}
        action={
          <div className="flex items-center gap-3">
            <p className={cn('text-xs', unread > 0 ? 'text-ink font-medium' : 'text-ink-soft')}>
              {unread > 0 ? pl.dashboard.activityUnread(unread) : pl.dashboard.activityUpToDate}
            </p>

            {/*
            „Odhacz" pokazuje się tylko wtedy, gdy jest co odhaczać. Przycisk
            widoczny nad pustą listą byłby zaproszeniem do klikania w nic.
          */}
            {fresh.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updateSettings.isPending}
                onClick={clear}
              >
                <CheckCheck className="size-3.5" aria-hidden />
                {pl.dashboard.activityClear}
              </Button>
            ) : null}
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="text-ink-soft mt-3.5 text-sm">
          {all.length === 0 ? pl.dashboard.activityEmpty : pl.dashboard.activityUpToDate}
        </p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((event) => (
            <ActivityRow
              key={event.id}
              event={event}
              // Odhaczone wiersze są przygaszone także wtedy, gdy się je
              // odsłoni — inaczej nie dałoby się ich odróżnić od nowych.
              muted={seenAt !== null && event.at <= seenAt}
            />
          ))}
        </ul>
      )}

      {/*
        Odsłonięcie odhaczonych. To jest gwarancja, że „Odhacz wszystko" nie
        jest przyciskiem, po którym coś przepada — a bez niej nikt nie
        kliknąłby go drugi raz.
      */}
      {older.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowOlder((open) => !open)}
          className="text-ink-soft hover:text-ink mt-3 text-xs underline underline-offset-4 transition-colors"
        >
          {showOlder
            ? pl.dashboard.activityHideOlder
            : pl.dashboard.activityShowOlder(older.length)}
        </button>
      ) : null}
    </section>
  );
}

function ActivityRow({ event, muted = false }: { event: ActivityEvent; muted?: boolean }) {
  const who =
    event.kind === 'viewed'
      ? event.clientName || pl.dashboard.activitySomeone
      : event.who || event.clientName || pl.dashboard.activitySomeone;
  const quoteLabel = [event.quoteNumber, event.quoteTitle].filter(Boolean).join(' · ');

  return (
    <li className={cn('border-hair border-b', muted && 'opacity-55')}>
      <Link
        to={routes.quote(event.quoteId)}
        className="hover:bg-surface-2/60 -mx-2 grid grid-cols-[3px_minmax(0,1fr)_auto] items-start gap-3.5 rounded-[var(--radius-control)] px-2 py-3 transition-colors"
      >
        <span
          aria-hidden
          className="mt-0.5 h-full min-h-8 w-[3px] rounded-[2px]"
          style={{ background: muted ? 'transparent' : BAR[event.kind] }}
        />

        <span className="min-w-0">
          {/* Jedno zdanie: nazwisko półgrubym, rodzaj zdarzenia w tonie
              drugorzędnym — rejestr, nie strumień wiadomości (T-97). */}
          <span className="text-ink block text-sm">
            <span className="font-medium">{who}</span>
            {' — '}
            <span className="text-ink-soft">{pl.dashboard.activityKind[event.kind]}</span>
          </span>
          <span className="text-ink-soft block truncate text-[12.5px]">{quoteLabel}</span>
          {event.message ? (
            <span className="bg-surface-2 text-ink mt-1.5 inline-block max-w-full truncate rounded-[6px] px-2.5 py-1.5 text-[13px]">
              „{event.message}"
            </span>
          ) : null}
        </span>

        <span className="text-ink-faint pt-0.5 text-xs whitespace-nowrap">
          {formatRelativeDay(event.at)}
        </span>
      </Link>
    </li>
  );
}
