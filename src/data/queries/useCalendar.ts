import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCalendarNote,
  deleteCalendarNote,
  listCalendarEvents,
  listCalendarNotes,
  noteToEvent,
  updateCalendarNote,
  type CalendarNotePatch,
  type CreateCalendarNoteInput,
} from '@/data/repos/calendar.repo';
import { queryKeys } from '@/data/query-keys';
import { groupByDay, type CalendarEvent, type DayRange, type IsoDay } from '@/domain/calendar';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Kalendarz miesiąca (T-98).
 *
 * ## Dwa zapytania, nie jedno
 *
 * Notatki i odczyty z reszty aplikacji mają różny cykl życia: notatkę zmienia
 * użytkownik i musi ją zobaczyć natychmiast, terminy zmieniają się przy okazji
 * pracy gdzie indziej. Wspólny klucz cache znaczyłby, że dopisanie notatki
 * pociąga ponowne policzenie wszystkich terminów z harmonogramów.
 */
export function useCalendarNotes(range: DayRange) {
  return useQuery({
    queryKey: queryKeys.calendarNotes(range),
    queryFn: () => listCalendarNotes(range),
  });
}

export function useCalendarEvents(range: DayRange) {
  return useQuery({
    queryKey: queryKeys.calendarEvents(range),
    queryFn: () => listCalendarEvents(range),
    // Terminy powstają z danych, których nikt nie zmienia z tego ekranu.
    // Minuta świeżości oszczędza przeliczanie harmonogramów przy każdym
    // przeskoku między miesiącami tam i z powrotem.
    staleTime: 60_000,
  });
}

/** Zdarzenia miesiąca pogrupowane po dniu — jedno źródło dla siatki i panelu dnia. */
export function useCalendarMonth(range: DayRange): {
  byDay: Map<IsoDay, CalendarEvent[]>;
  isLoading: boolean;
  error: Error | null;
} {
  const notes = useCalendarNotes(range);
  const events = useCalendarEvents(range);

  const byDay = useMemo(
    () => groupByDay([...(notes.data ?? []).map(noteToEvent), ...(events.data ?? [])]),
    [notes.data, events.data],
  );

  return {
    byDay,
    isLoading: notes.isLoading || events.isLoading,
    error: notes.error ?? events.error ?? null,
  };
}

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.calendarNotes() });
}

export function useCreateCalendarNote() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (input: Omit<CreateCalendarNoteInput, 'workspaceId'>) =>
      createCalendarNote({ ...input, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateCalendarNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CalendarNotePatch }) =>
      updateCalendarNote(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteCalendarNote() {
  const invalidate = useInvalidateNotes();

  return useMutation({
    mutationFn: (id: string) => deleteCalendarNote(id),
    onSuccess: invalidate,
  });
}
