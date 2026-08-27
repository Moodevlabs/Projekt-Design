import {
  CalendarClock,
  FileClock,
  HardHat,
  Ruler,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';

import type { CalendarEventKind } from '@/domain/calendar';

/**
 * Oznaczenia rodzajów zdarzeń (T-98).
 *
 * ## Dlaczego kolory z palety statusów, a nie nowe
 *
 * Aplikacja ma już pięć kolorów o ustalonym znaczeniu (`--status-*`) i to
 * ich znaczenie pokrywa się z tym, co niesie kalendarz: termin jest
 * zobowiązaniem, ważność oferty wygasa, wizja lokalna jest faktem. Dołożenie
 * drugiej palety znaczyłoby dwa zestawy kolorów mówiących o tym samym.
 *
 * Kropka niesie kolor, ale nie tylko kolor: w panelu dnia każdy rodzaj ma
 * też ikonę i podpis. Sam odcień nie może być jedynym nośnikiem znaczenia.
 */
export const EVENT_DOT_CLASS: Record<CalendarEventKind, string> = {
  note: 'bg-[var(--status-draft)]',
  deadline: 'bg-[var(--status-accepted)]',
  project_start: 'bg-[var(--status-sent)]',
  site_visit: 'bg-[var(--ink-soft)]',
  quote_validity: 'bg-[var(--status-expired)]',
};

export const EVENT_ICON: Record<CalendarEventKind, LucideIcon> = {
  note: StickyNote,
  deadline: CalendarClock,
  project_start: HardHat,
  site_visit: Ruler,
  quote_validity: FileClock,
};
