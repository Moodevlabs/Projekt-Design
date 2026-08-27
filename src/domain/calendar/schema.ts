import { z } from 'zod';

/**
 * Kalendarz terminów (T-98).
 *
 * ## Czym jest
 *
 * Jednym widokiem na daty, które w aplikacji już istnieją, ale leżą w pięciu
 * różnych miejscach: data rozpoczęcia projektu, wizja lokalna, ważność oferty,
 * termin z harmonogramu zaakceptowanej wyceny. Do tego notatka dzienna —
 * jedyny byt, który powstaje w samym kalendarzu.
 *
 * ## Czym NIE jest
 *
 * Kalendarzem spotkań ani systemem zarządzania pracą (CLAUDE.md, „Czego NIE
 * robić"). Nie ma zaproszeń, uczestników, powtarzalności, przypomnień ani osi
 * czasu w rodzaju Gantta. Zdarzenia są **odczytem** stanu aplikacji; jedyną
 * rzeczą, którą da się tu utworzyć, jest notatka.
 *
 * ## Dlaczego zdarzenia mają wspólny kształt
 *
 * Cztery źródła, cztery różne wiersze bazy, jedna kratka w siatce miesiąca.
 * Bez wspólnego kształtu każdy komponent siatki musiałby znać wszystkie
 * źródła i rozgałęziać się na ich polach.
 */

/** Data dnia w formacie `YYYY-MM-DD`. Ta sama konwencja co w harmonogramie. */
export type IsoDay = string;

/**
 * Rodzaj zdarzenia.
 *
 * Kolejność ma znaczenie: po niej sortujemy wpisy w dniu, żeby własna notatka
 * stała nad odczytami z reszty aplikacji. Notatka jest jedynym wpisem, który
 * ktoś umieścił tam świadomie.
 */
export const CalendarEventKindSchema = z.enum([
  'note',
  'deadline',
  'project_start',
  'site_visit',
  'quote_validity',
]);
export type CalendarEventKind = z.infer<typeof CalendarEventKindSchema>;

export const CALENDAR_EVENT_KINDS: readonly CalendarEventKind[] = CalendarEventKindSchema.options;

export interface CalendarEvent {
  /** Klucz listy — identyfikator wiersza źródłowego z prefiksem rodzaju. */
  id: string;
  kind: CalendarEventKind;
  day: IsoDay;
  /** Godzina `HH:MM`, wyłącznie dla notatek, które ją mają. */
  time: string | null;
  title: string;
  /** Druga linia w panelu dnia: klient, projekt, numer oferty. */
  subtitle: string | null;
  /** Dokąd prowadzi kliknięcie. `null` = wpis bez własnego ekranu. */
  href: string | null;
  /** Wyłącznie dla notatek — odhaczenie wpisu. */
  done?: boolean;
}

/** Notatka dzienna — jedyny byt tworzony w samym kalendarzu. */
export const CalendarNoteSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  clientId: z.string().uuid().nullable().default(null),
  projectId: z.string().uuid().nullable().default(null),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie RRRR-MM-DD'),
  /** `HH:MM` albo `null`. Baza trzyma `time`, więc bywa `HH:MM:SS`. */
  time: z.string().nullable().default(null),
  text: z.string().default(''),
  done: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CalendarNote = z.infer<typeof CalendarNoteSchema>;

/** Zakres pobrania — zawsze cały widoczny miesiąc razem z dopełnieniem siatki. */
export interface DayRange {
  from: IsoDay;
  to: IsoDay;
}
