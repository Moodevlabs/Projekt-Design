import {
  isSameMonth,
  isSunday,
  isWeekend,
  kindsOfDay,
  monthGrid,
  weekdayIndex,
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
 *
 * ## Wysokość bierze się z OKNA, nie z proporcji kratki
 *
 * Kratki kwadratowe (pierwsza wersja) rosły razem z szerokością: przy szerokim
 * oknie sześć wierszy dawało blisko tysiąc pikseli i panel dnia lądował pod
 * krawędzią ekranu. Siatka ma teraz sześć wierszy równej wysokości wewnątrz
 * kontenera mierzonego względem wysokości okna (`dvh`), z ogranicznikami
 * `clamp`: na niskim oknie kurczy się, na wysokim przestaje rosnąć, bo dalsze
 * powiększanie pustych kratek niczego nie dodaje.
 */
export function MonthGrid({ month, today, selected, byDay, onSelect }: MonthGridProps) {
  const weeks = monthGrid(month);

  return (
    <div className="card-surface p-2 sm:p-3">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {pl.calendar.weekdays.map((label, index) => (
          <div
            key={label}
            className={cn(
              'label-caps px-1 pb-1.5 text-center',
              index === 6 ? 'text-[var(--status-rejected)]' : 'text-ink-faint',
            )}
          >
            <abbr title={pl.calendar.weekdaysFull[index]} className="no-underline">
              {label}
            </abbr>
          </div>
        ))}
      </div>

      <div
        className="mt-0.5 grid grid-cols-7 grid-rows-6 gap-1 sm:gap-1.5"
        style={{ height: 'clamp(16rem, 50dvh, 27rem)' }}
      >
        {weeks.flat().map((day) => {
          const events = byDay.get(day) ?? [];
          const outside = !isSameMonth(day, month);
          const isToday = day === today;
          const isSelected = day === selected;
          const sunday = isSunday(day);

          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              aria-label={dayAriaLabel(day, events.length)}
              onClick={() => onSelect(day)}
              className={cn(
                'group border-hair flex min-h-0 flex-col items-center justify-start rounded-[var(--radius-control)] border border-transparent px-1 pt-1 pb-0.5 transition-colors',
                'hover:border-hair-strong hover:bg-surface-2',
                // Weekend dostaje własne tło — kolumny sobotnia i niedzielna
                // mają być rozpoznawalne bez czytania główki.
                isWeekend(day) && 'bg-surface-2/60',
                isSelected && 'border-primary bg-surface-2',
              )}
            >
              <span
                className={cn(
                  // Numer i kropki kurczą się razem z kratką: przy niskim oknie
                  // wiersz ma około 40 px i element stałej wielkości przyciąłby
                  // oznaczenia zdarzeń.
                  'tabular flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] sm:size-6 sm:text-xs',
                  isToday && 'bg-primary text-primary-foreground font-semibold',
                  // Niedziela na czerwono, sobota tylko przygaszona — konwencja
                  // polskich kalendarzy. Dzień spoza miesiąca traci nasycenie,
                  // ale nie kolor: 30 listopada widziany w grudniu ma nadal
                  // być rozpoznawalny jako niedziela.
                  !isToday && sunday && 'text-[var(--status-rejected)]',
                  !isToday && !sunday && !outside && 'text-ink',
                  !isToday && !sunday && outside && 'text-ink-faint',
                  !isToday && outside && 'opacity-60',
                )}
              >
                {Number(day.slice(8, 10))}
              </span>

              {/*
                Kropki stoją pod numerem i nie zmieniają wysokości kratki:
                miesiąc z jednym gęstym dniem nie ma prawa rozpychać siatki.
              */}
              <span className="mt-0.5 flex h-2 shrink-0 items-center justify-center gap-0.5 sm:mt-1">
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
    pl.calendar.weekdaysFull[weekdayIndex(day)] ?? '',
  );
  return count === 0 ? label : `${label} — ${pl.calendar.eventCount(count)}`;
}
