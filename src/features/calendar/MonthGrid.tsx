import {
  isSameMonth,
  isWeekend,
  kindsOfDay,
  monthGrid,
  type CalendarEvent,
  type IsoDay,
  type MonthRef,
} from '@/domain/calendar';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { EVENT_DOT_CLASS } from './event-style';

export interface MonthGridProps {
  month: MonthRef;
  today: IsoDay;
  selected: IsoDay;
  byDay: Map<IsoDay, CalendarEvent[]>;
  onSelect: (day: IsoDay) => void;
}

/**
 * Siatka miesiąca (T-98).
 *
 * ## Dlaczego kropki, a nie treść wpisów
 *
 * Kratka miesiąca ma szerokość jednej siódmej ekranu. Wpisana w nią treść
 * albo się urywa, albo rozpycha wiersz — a i tak nie da się jej przeczytać
 * bez zatrzymania wzroku. Kropka odpowiada na pytanie, które zadaje się
 * kalendarzowi z odległości metra: „czy tego dnia coś jest i jakiego rodzaju".
 * Treść należy do panelu dnia, gdzie jest miejsce na całe zdanie.
 *
 * Kropka na rodzaj, nie na zdarzenie — trzy terminy tego samego rodzaju nie
 * niosą więcej niż jeden, a zajmują trzy razy tyle miejsca (`kindsOfDay`).
 */
export function MonthGrid({ month, today, selected, byDay, onSelect }: MonthGridProps) {
  const weeks = monthGrid(month);

  return (
    <div className="card-surface overflow-hidden p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {pl.calendar.weekdays.map((label, index) => (
          <div
            key={label}
            className={cn(
              'label-caps text-ink-faint px-1 pb-1.5 text-center',
              index >= 5 && 'text-ink-faint/70',
            )}
          >
            <abbr title={pl.calendar.weekdaysFull[index]} className="no-underline">
              {label}
            </abbr>
          </div>
        ))}

        {weeks.flat().map((day) => {
          const events = byDay.get(day) ?? [];
          const outside = !isSameMonth(day, month);
          const isToday = day === today;
          const isSelected = day === selected;

          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              aria-label={dayAriaLabel(day, events.length)}
              onClick={() => onSelect(day)}
              className={cn(
                'group border-hair relative flex aspect-square flex-col items-center justify-start rounded-[var(--radius-control)] border border-transparent px-1 pt-1.5 pb-1 transition-colors',
                'hover:border-hair-strong hover:bg-surface-2',
                outside && 'text-ink-faint',
                !outside && isWeekend(day) && 'text-ink-soft',
                isSelected && 'border-primary bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'tabular flex size-6 items-center justify-center rounded-full text-xs',
                  isToday && 'bg-primary text-primary-foreground font-semibold',
                  !isToday && !outside && 'text-ink',
                )}
              >
                {Number(day.slice(8, 10))}
              </span>

              {/*
                Kropki stoją pod numerem i nie zmieniają wysokości kratki:
                miesiąc z jednym gęstym dniem nie ma prawa rozpychać siatki.
              */}
              <span className="mt-1 flex h-2 items-center justify-center gap-0.5">
                {kindsOfDay(events).map((kind) => (
                  <span
                    key={kind}
                    aria-hidden
                    title={pl.calendar.kind[kind]}
                    className={cn('size-1.5 rounded-full', EVENT_DOT_CLASS[kind])}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function dayAriaLabel(day: IsoDay, count: number): string {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const label = pl.calendar.dayLabel(
    dayOfMonth ?? 1,
    pl.calendar.monthsGenitive[(month ?? 1) - 1] ?? '',
    year ?? 0,
    weekdayName(day),
  );
  return count === 0 ? label : `${label} — ${pl.calendar.eventCount(count)}`;
}

function weekdayName(day: IsoDay): string {
  const date = new Date(`${day}T00:00:00Z`);
  const index = (date.getUTCDay() + 6) % 7;
  return pl.calendar.weekdaysFull[index] ?? '';
}
