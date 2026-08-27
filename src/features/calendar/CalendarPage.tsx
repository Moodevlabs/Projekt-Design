import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendarMonth } from '@/data/queries/useCalendar';
import { useEntitlement } from '@/features/billing/useEntitlement';
import {
  CALENDAR_EVENT_KINDS,
  gridRange,
  isSameMonth,
  monthOf,
  shiftMonth,
  todayIso,
} from '@/domain/calendar';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { DayPanel } from './DayPanel';
import { EVENT_DOT_CLASS } from './event-style';
import { MonthGrid } from './MonthGrid';

/**
 * Ekran „Kalendarz" (T-98).
 *
 * ## Po co on jest
 *
 * Terminy w Toolier istniały od dawna, ale każdy w swoim miejscu: data
 * rozpoczęcia w teczce, wizja lokalna w projekcie, ważność na wycenie, termin
 * oddania w harmonogramie. Pytanie „co mam w tym tygodniu" wymagało otwarcia
 * czterech ekranów i policzenia w głowie.
 *
 * ## Czego tu nie ma i nie będzie
 *
 * Osi czasu w rodzaju Gantta, zapraszania osób, powtarzalności i powiadomień
 * (CLAUDE.md, „Czego NIE robić"). Kalendarz **czyta** stan aplikacji; jedyną
 * rzeczą, którą da się tu utworzyć, jest notatka dzienna.
 */
export function CalendarPage() {
  const today = todayIso();
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => monthOf(today));
  const canWrite = useEntitlement().canWrite;

  const range = useMemo(() => gridRange(month), [month]);
  const { byDay, isLoading, error } = useCalendarMonth(range);

  const monthCount = useMemo(() => {
    let count = 0;
    for (const [day, events] of byDay) {
      if (isSameMonth(day, month)) count += events.length;
    }
    return count;
  }, [byDay, month]);

  const goToMonth = (delta: number) => setMonth((current) => shiftMonth(current, delta));

  const goToToday = () => {
    setMonth(monthOf(today));
    setSelected(today);
  };

  /*
   * Wybór dnia spoza bieżącego miesiąca (dopełnienie siatki) przestawia też
   * miesiąc. Bez tego zaznaczona kratka wypadałaby poza widok przy pierwszym
   * przewinięciu, a panel pod spodem opisywałby dzień, którego nie widać.
   */
  const selectDay = (day: string) => {
    setSelected(day);
    if (!isSameMonth(day, month)) setMonth(monthOf(day));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-prose space-y-1">
          <h1 className="text-ink font-display text-xl tracking-tight">{pl.calendar.title}</h1>
          <p className="text-ink-soft text-sm">{pl.calendar.intro}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.calendar.previousMonth}
            onClick={() => goToMonth(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <h2 className="text-ink min-w-44 text-center text-sm font-semibold">
            {pl.calendar.monthLabel(pl.calendar.months[month.month - 1] ?? '', month.year)}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.calendar.nextMonth}
            onClick={() => goToMonth(1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={goToToday}>
            {pl.calendar.today}
          </Button>
        </div>

        <p className="text-ink-soft text-xs">{pl.calendar.monthSummary(monthCount)}</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error.message || pl.calendar.loadError}</AlertDescription>
        </Alert>
      ) : null}

      {/*
        Siatka trzyma pełną szerokość kolumny — tę samą, co nagłówek, legenda
        i panel dnia. Zwężona (próba z `max-w-3xl`) czytała się jak osobne
        okno wstawione w środek ekranu, bo kończyła się w innym miejscu niż
        wszystko pod nią i nad nią. Kratka szersza niż wyższa jest normalna
        w widoku miesiąca; wysokość pilnuje `clamp` w `MonthGrid`.
      */}
      {isLoading ? (
        <Skeleton
          className="rounded-[var(--radius-card)]"
          style={{ height: 'clamp(20rem, 60dvh, 34rem)' }}
        />
      ) : (
        <MonthGrid
          month={month}
          today={today}
          selected={selected}
          byDay={byDay}
          onSelect={selectDay}
        />
      )}

      <Legend />

      <DayPanel day={selected} events={byDay.get(selected) ?? []} canWrite={canWrite} />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="label-caps text-ink-faint">{pl.calendar.legend}</span>
      {CALENDAR_EVENT_KINDS.map((kind) => (
        <span key={kind} className="text-ink-soft flex items-center gap-1.5 text-xs">
          <span className={cn('size-1.5 rounded-full', EVENT_DOT_CLASS[kind])} aria-hidden />
          {pl.calendar.kind[kind]}
        </span>
      ))}
    </div>
  );
}
