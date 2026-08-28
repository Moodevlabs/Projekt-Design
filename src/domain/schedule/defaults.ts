import { newId } from '../id';
import {
  ScheduleBodySchema,
  ScheduleStageSchema,
  type ScheduleBody,
  type ScheduleStage,
} from './schema';

/**
 * Domyślny szablon etapów (F5.1) — odwzorowanie arkusza `TERMIN - DOKUMENT`.
 *
 * To **punkt wyjścia do edycji**, a nie prawda o czyimś procesie. Liczby są
 * z arkusza klienta; każdy workspace nadpisuje je u siebie
 * (`workspaces.settings.scheduleTemplate`). Pusty harmonogram byłby gorszy:
 * nikt nie zaczyna planowania od czystej kartki, a trzynaście wierszy do
 * odhaczenia jest łatwiejsze niż trzynaście do wymyślenia.
 *
 * ## Wszystkie etapy startują ODZNACZONE (2026-08-27)
 *
 * Do tej pory szablon dawał komplet z zaznaczonymi „ptaszkami". Wyglądało to
 * tak, jakby wycena obejmowała już wszystko — łącznie z etapami, których
 * nikt nie zamawiał — a termin pokazywał sumę dni policzoną z całości.
 * Domyślne „tak" przy trzynastu pozycjach naraz jest myląca: człowiek widzi
 * gotową listę i nie czyta jej, bo wygląda na wynik, a nie na propozycję.
 *
 * Teraz lista jest propozycją wprost: zaznaczasz to, co wchodzi w zakres.
 * Termin startuje od zera i rośnie razem z tym, na co się umówiliście.
 *
 * ⚠️ Dotyczy **nowych** harmonogramów. Wyceny, które już mają zapisany
 * harmonogram, zostają bez zmian — `enabled` siedzi w ich `quotes.schedule`.
 *
 * `id` powstają przy każdym wywołaniu, bo etap jest bytem konkretnej wyceny —
 * dwa dokumenty nie mogą dzielić identyfikatora.
 */
/**
 * Szablon etapu — bez `id` i bez pól etapu zbiorczego. Szablon nigdy nie
 * opisuje `extras` (T-64): ten etap zakłada most z cennika, a nie ustawienia
 * studia.
 */
export type StageTemplate = Omit<ScheduleStage, 'id' | 'kind' | 'extras'>;

const SZABLON: StageTemplate[] = [
  {
    name: 'Inwentaryzacja',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Rzuty funkcjonalne',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0.5,
    roomScope: 'all',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Wybór rzutu przez inwestora',
    owner: 'client',
    baseDays: 3,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Finalny rzut',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Spotkania',
    owner: 'client',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: ['meeting'],
  },
  {
    name: 'Zbieranie inspiracji',
    owner: 'client',
    baseDays: 5,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Moodboard',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'visual',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Wizualizacje 3D',
    owner: 'provider',
    baseDays: 0,
    perRoomDays: {},
    defaultPerRoomDays: 2,
    roomScope: 'visual',
    enabled: false,
    linkedItemTags: ['visualization'],
  },
  {
    name: 'Akceptacja wizualizacji',
    owner: 'client',
    baseDays: 0,
    perRoomDays: {},
    defaultPerRoomDays: 1,
    roomScope: 'visual',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Rysunki techniczne',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 1.5,
    roomScope: 'technical',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Teczka projektowa',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: [],
  },
  {
    name: 'Komunikacja projektowa',
    owner: 'provider',
    baseDays: 2,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    enabled: false,
    linkedItemTags: ['communication'],
  },
];

/**
 * Etapy szablonu ze świeżymi identyfikatorami.
 *
 * `template` pozwala podstawić własny szablon workspace'u
 * (`settings.scheduleTemplate`); `null` znaczy „użyj wbudowanego".
 */

/**
 * Wbudowany szablon jako lista wpisów — treść seedu biblioteki dokumentów
 * (T-102). Kopia, nie referencja: biblioteka może ją potem edytować.
 */
export function builtInScheduleTemplate(): StageTemplate[] {
  return structuredClone(SZABLON);
}

export function defaultScheduleStages(template: StageTemplate[] | null = null): ScheduleStage[] {
  return (template ?? SZABLON).map((stage) => ({
    ...stage,
    id: newId(),
    kind: 'normal' as const,
    extras: [],
  }));
}

/**
 * Nowy etap harmonogramu.
 *
 * Czyta wymienione pola i przepuszcza wynik przez schemat — ta sama zasada co
 * w `newRoom`/`newDiscount`: akcje bywają podpinane wprost pod `onClick`,
 * a obiekt zdarzenia rozsypany do dokumentu psuje zapis.
 */
export function newStage(partial: Partial<ScheduleStage> = {}): ScheduleStage {
  const domyslny: ScheduleStage = {
    id: newId(),
    name: 'Nowy etap',
    owner: 'provider',
    baseDays: 1,
    perRoomDays: {},
    defaultPerRoomDays: 0,
    roomScope: 'none',
    // Etap dodany RĘCZNIE startuje zaznaczony — kliknięcie „Dodaj etap" jest
    // już świadomą decyzją, że coś wchodzi w zakres. Odznaczone są wyłącznie
    // pozycje z gotowego szablonu, których nikt nie wybierał (SZABLON wyżej).
    enabled: true,
    linkedItemTags: [],
    kind: 'normal',
    extras: [],
  };

  const kandydat: ScheduleStage = {
    ...domyslny,
    ...(partial.id === undefined ? {} : { id: partial.id }),
    ...(partial.name === undefined ? {} : { name: partial.name }),
    ...(partial.owner === undefined ? {} : { owner: partial.owner }),
    ...(partial.baseDays === undefined ? {} : { baseDays: partial.baseDays }),
    ...(partial.perRoomDays === undefined ? {} : { perRoomDays: partial.perRoomDays }),
    ...(partial.defaultPerRoomDays === undefined
      ? {}
      : { defaultPerRoomDays: partial.defaultPerRoomDays }),
    ...(partial.roomScope === undefined ? {} : { roomScope: partial.roomScope }),
    ...(partial.enabled === undefined ? {} : { enabled: partial.enabled }),
    ...(partial.linkedItemTags === undefined ? {} : { linkedItemTags: partial.linkedItemTags }),
    ...(partial.kind === undefined ? {} : { kind: partial.kind }),
    ...(partial.extras === undefined ? {} : { extras: partial.extras }),
  };

  return ScheduleStageSchema.safeParse(kandydat).data ?? domyslny;
}

/** Nowy harmonogram wyceny z etapami z szablonu. */
export function newScheduleBody(
  partial: Partial<ScheduleBody> = {},
  template: StageTemplate[] | null = null,
): ScheduleBody {
  return ScheduleBodySchema.parse({ stages: defaultScheduleStages(template), ...partial });
}

/**
 * Harmonogram przeniesiony z szablonu do nowej wyceny (T-63).
 *
 * Data startu ZAWSZE wypada — należy do konkretnego projektu, nie do pakietu.
 * Szablon zapisany w marcu z marcową datą byłby pułapką, której nikt nie
 * zauważy przed wysłaniem oferty. Zerujemy i przy zapisie szablonu, i tutaj:
 * szablony sprzed T-63 mogą nieść datę z importu.
 */
export function scheduleFromTemplate(schedule: ScheduleBody | null): ScheduleBody | null {
  if (!schedule) return null;
  return { ...structuredClone(schedule), startDate: null };
}
