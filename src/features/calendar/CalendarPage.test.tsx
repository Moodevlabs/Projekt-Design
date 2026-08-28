import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { groupByDay, type CalendarEvent } from '@/domain/calendar';
import { pl } from '@/i18n/pl';

const useCalendarMonth = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useCalendar', () => ({
  useCalendarMonth,
  useCreateCalendarNote: () => ({ mutate: createMutate, isPending: false }),
  useUpdateCalendarNote: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteCalendarNote: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: true }),
}));

vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn() },
}));

const { CalendarPage } = await import('./CalendarPage');

/*
 * Testy stoją na ZAMROŻONYM „dziś": kalendarz startuje na miesiącu bieżącym,
 * więc bez tego zestaw widocznych dni zmieniałby się każdego dnia, a test
 * przestawałby przechodzić bez żadnej zmiany w kodzie.
 */
const TODAY = new Date(2026, 8, 14, 12, 0, 0); // poniedziałek, 14 września 2026

function event(
  partial: Partial<CalendarEvent> & Pick<CalendarEvent, 'kind' | 'day'>,
): CalendarEvent {
  return {
    id: `${partial.kind}:${partial.day}`,
    time: null,
    title: '',
    subtitle: null,
    href: null,
    ...partial,
  };
}

function renderPage(events: CalendarEvent[] = []) {
  useCalendarMonth.mockReturnValue({
    byDay: groupByDay(events),
    isLoading: false,
    error: null,
  });

  return render(
    <MemoryRouter>
      <CalendarPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
});

describe('CalendarPage', () => {
  it('startuje na bieżącym miesiącu i dzisiejszym dniu', () => {
    renderPage([
      event({ kind: 'deadline', day: '2026-09-14', title: 'Termin oddania', subtitle: 'Kowalscy' }),
    ]);

    expect(screen.getByText(pl.calendar.monthLabel('wrzesień', 2026))).toBeInTheDocument();
    // Panel dnia opisuje dzień wybrany, czyli na starcie dzisiejszy.
    expect(screen.getByText(/14 września 2026/)).toBeInTheDocument();
    expect(screen.getByText('Termin oddania')).toBeInTheDocument();
  });

  it('przewija miesiące w obie strony', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: pl.calendar.nextMonth }));
    expect(screen.getByText(pl.calendar.monthLabel('październik', 2026))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.calendar.previousMonth }));
    await user.click(screen.getByRole('button', { name: pl.calendar.previousMonth }));
    expect(screen.getByText(pl.calendar.monthLabel('sierpień', 2026))).toBeInTheDocument();
  });

  it('kliknięcie dnia pokazuje jego wpisy w panelu pod kalendarzem', async () => {
    const user = userEvent.setup();
    renderPage([
      event({ kind: 'site_visit', day: '2026-09-21', title: 'Dom 164 m²', subtitle: 'obmiar' }),
    ]);

    expect(screen.queryByText('Dom 164 m²')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /21 września 2026/ }));

    expect(screen.getByText('Dom 164 m²')).toBeInTheDocument();
    expect(screen.getByText(/21 września 2026/)).toBeInTheDocument();
  });

  it('wybór dnia z dopełnienia siatki przestawia miesiąc', async () => {
    // 31 sierpnia widać w pierwszym wierszu września. Bez przestawienia
    // miesiąca zaznaczona kratka wypadłaby poza widok przy pierwszym
    // przewinięciu, a panel opisywałby dzień, którego nie widać.
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /31 sierpnia 2026/ }));

    expect(screen.getByText(pl.calendar.monthLabel('sierpień', 2026))).toBeInTheDocument();
  });

  it('nie zapisuje pustej notatki', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: pl.calendar.noteAdd }));
    await user.click(screen.getByRole('button', { name: pl.calendar.noteSave }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(pl.calendar.noteEmpty);
  });

  it('zapisuje notatkę z godziną na wybranym dniu', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /18 września 2026/ }));
    await user.click(screen.getByRole('button', { name: pl.calendar.noteAdd }));
    await user.type(screen.getByLabelText(pl.calendar.noteTextLabel), 'Montaż zabudowy');
    await user.type(screen.getByLabelText(pl.calendar.noteTimeLabel), '10:00');
    await user.click(screen.getByRole('button', { name: pl.calendar.noteSave }));

    expect(createMutate).toHaveBeenCalledWith(
      { day: '2026-09-18', text: 'Montaż zabudowy', time: '10:00' },
      expect.anything(),
    );
  });

  it('pozwala poprawic tresc i godzine istniejacej notatki', async () => {
    // Do 2026-08-28 notatke dalo sie tylko dodac i usunac, wiec literowka
    // znaczyla skasowanie wpisu razem ze stanem „wykonane".
    const user = userEvent.setup();
    renderPage([
      event({
        kind: 'note',
        day: '2026-09-14',
        id: 'note:abc',
        title: 'Montaz zabudowy',
        time: '10:00',
      }),
    ]);

    await user.click(screen.getByRole('button', { name: pl.calendar.noteEdit }));

    const tresc = screen.getByLabelText(pl.calendar.noteTextLabel);
    expect(tresc).toHaveValue('Montaz zabudowy');
    expect(screen.getByLabelText(pl.calendar.noteTimeLabel)).toHaveValue('10:00');

    await user.clear(tresc);
    await user.type(tresc, 'Montaz zabudowy kuchennej');
    await user.click(screen.getByRole('button', { name: pl.calendar.noteSave }));

    expect(updateMutate).toHaveBeenCalledWith(
      { id: 'abc', patch: { text: 'Montaz zabudowy kuchennej', time: '10:00' } },
      expect.anything(),
    );
  });

  it('edycja nie przyjmuje pustej tresci', async () => {
    const user = userEvent.setup();
    renderPage([
      event({ kind: 'note', day: '2026-09-14', id: 'note:abc', title: 'Montaz zabudowy' }),
    ]);

    await user.click(screen.getByRole('button', { name: pl.calendar.noteEdit }));
    await user.clear(screen.getByLabelText(pl.calendar.noteTextLabel));
    await user.click(screen.getByRole('button', { name: pl.calendar.noteSave }));

    expect(updateMutate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(pl.calendar.noteEmpty);
  });

  it('kratka niesie po jednej kropce na rodzaj, nie na zdarzenie', () => {
    renderPage([
      event({ kind: 'deadline', day: '2026-09-10', title: 'Pierwszy' }),
      event({ kind: 'deadline', day: '2026-09-10', title: 'Drugi', id: 'deadline:2' }),
      event({ kind: 'note', day: '2026-09-10', title: 'Notatka' }),
    ]);

    const cell = screen.getByRole('button', { name: /10 września 2026/ });
    expect(within(cell).getByTitle(pl.calendar.kind.deadline)).toBeInTheDocument();
    expect(within(cell).getByTitle(pl.calendar.kind.note)).toBeInTheDocument();
  });
});
