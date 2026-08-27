import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/shared';
import {
  useCreateCalendarNote,
  useDeleteCalendarNote,
  useUpdateCalendarNote,
} from '@/data/queries/useCalendar';
import type { CalendarEvent, IsoDay } from '@/domain/calendar';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { EVENT_ICON } from './event-style';

export interface DayPanelProps {
  day: IsoDay;
  events: readonly CalendarEvent[];
  canWrite: boolean;
}

/**
 * Szczegóły wybranego dnia — pod kalendarzem, nie nad nim (T-98).
 *
 * ## Dlaczego panel, a nie okno nad siatką
 *
 * Okno modalne zasłania kalendarz, czyli dokładnie to, po co człowiek na ten
 * ekran wszedł: żeby zobaczyć dzień w kontekście tygodnia i miesiąca.
 * Przeglądanie kolejnych dni wymagałoby wtedy zamykania i otwierania okna.
 * Panel pod siatką pozwala klikać dzień po dniu i czytać ich treść bez
 * ani jednego kliknięcia więcej.
 */
export function DayPanel({ day, events, canWrite }: DayPanelProps) {
  const create = useCreateCalendarNote();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      toast.error(pl.calendar.noteEmpty);
      return;
    }

    create.mutate(
      { day, text: trimmed, time: time === '' ? null : time },
      {
        onSuccess: () => {
          setText('');
          setTime('');
          setAdding(false);
          toast.success(pl.calendar.noteSaved);
        },
        onError: (error) => toast.error(error.message || pl.calendar.noteFailed),
      },
    );
  };

  return (
    <section className="card-surface space-y-4 p-5" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-ink text-sm font-semibold">{formatDayHeading(day)}</h2>
        <p className="text-ink-soft text-xs">{pl.calendar.eventCount(events.length)}</p>
      </div>

      {events.length === 0 ? (
        <p className="text-ink-soft text-sm">
          {pl.calendar.dayEmpty} {canWrite ? pl.calendar.dayEmptyHint : ''}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event) => (
            <EventRow key={event.id} event={event} canWrite={canWrite} />
          ))}
        </ul>
      )}

      {canWrite ? (
        adding ? (
          <form
            className="border-hair space-y-3 rounded-[var(--radius-control)] border p-3"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              submit();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="calendar-note-text">{pl.calendar.noteTextLabel}</Label>
              <Input
                id="calendar-note-text"
                value={text}
                autoFocus
                maxLength={500}
                placeholder={pl.calendar.notePlaceholder}
                onChange={(changeEvent) => setText(changeEvent.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="calendar-note-time">{pl.calendar.noteTimeLabel}</Label>
                <Input
                  id="calendar-note-time"
                  type="time"
                  value={time}
                  className="w-32"
                  onChange={(changeEvent) => setTime(changeEvent.target.value)}
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  {pl.common.cancel}
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {pl.calendar.noteSave}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            {pl.calendar.noteAdd}
          </Button>
        )
      ) : null}
    </section>
  );
}

function EventRow({ event, canWrite }: { event: CalendarEvent; canWrite: boolean }) {
  const update = useUpdateCalendarNote();
  const remove = useDeleteCalendarNote();
  const [removeOpen, setRemoveOpen] = useState(false);

  const Icon = EVENT_ICON[event.kind];
  const noteId = event.kind === 'note' ? event.id.slice('note:'.length) : null;

  return (
    <li className="border-hair flex items-start gap-3 rounded-[var(--radius-control)] border px-3 py-2">
      <Icon className="text-ink-soft mt-0.5 size-4 shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className={cn('text-ink text-sm', event.done && 'text-ink-faint line-through')}>
          {event.time ? <span className="tabular text-ink-soft mr-2">{event.time}</span> : null}
          {event.title}
        </p>
        <p className="text-ink-soft text-xs">
          {pl.calendar.kind[event.kind]}
          {event.subtitle ? ` · ${event.subtitle}` : ''}
        </p>
      </div>

      {event.href ? (
        <Link
          to={event.href}
          className="text-ink-soft hover:text-ink shrink-0 text-xs underline-offset-2 hover:underline"
        >
          {pl.calendar.open}
        </Link>
      ) : null}

      {noteId && canWrite ? (
        <span className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.calendar.noteDone}
            aria-pressed={event.done}
            onClick={() =>
              update.mutate(
                { id: noteId, patch: { done: !event.done } },
                { onError: (error) => toast.error(error.message) },
              )
            }
          >
            <Check className={cn('size-4', event.done && 'text-ink')} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={pl.calendar.noteDelete}
            onClick={() => setRemoveOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>

          <ConfirmDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            title={pl.calendar.noteDelete}
            description={pl.calendar.noteDeleteConfirm}
            confirmLabel={pl.common.delete}
            destructive
            onConfirm={() =>
              remove.mutate(noteId, { onError: (error) => toast.error(error.message) })
            }
          />
        </span>
      ) : null}
    </li>
  );
}

/** „poniedziałek, 14 września 2026" — dopełniacz miesiąca, jak w polszczyźnie. */
function formatDayHeading(day: IsoDay): string {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = pl.calendar.weekdaysFull[(date.getUTCDay() + 6) % 7] ?? '';
  return pl.calendar.dayLabel(
    dayOfMonth ?? 1,
    pl.calendar.monthsGenitive[(month ?? 1) - 1] ?? '',
    year ?? 0,
    weekday,
  );
}
