import { z } from 'zod';
import { RoomScopeSchema } from '../quote/schema';

/**
 * Harmonogram wyceny (F5.1).
 *
 * Model jest bliźniaczo podobny do cennika parametrycznego — i to celowe.
 * Etap trwa „tyle a tyle na cały projekt plus tyle na pomieszczenie", dokładnie
 * jak usługa kosztuje „bazę plus składnik za pomieszczenie". Te same
 * pomieszczenia, ten sam zasięg (`visual` / `technical`), ta sama mapa po typie
 * pomieszczenia. Drugi, inny model dla tej samej myśli znaczyłby dwa miejsca
 * do poprawiania przy każdej zmianie.
 */

/** Kto zużywa czas: wykonawca czy inwestor (arkusz: ARCH. / INW.). */
export const StageOwnerSchema = z.enum(['provider', 'client']);
export type StageOwner = z.infer<typeof StageOwnerSchema>;

/**
 * Jedna usługa dodatkowa doliczona do terminu (T-64).
 *
 * Etap `extras` trzyma **listę**, a nie samą sumę, bo użytkownik ma widzieć,
 * skąd wzięło się „+5 dni". Sama liczba w polu `baseDays` byłaby prawdziwa
 * i zupełnie nieczytelna miesiąc później.
 */
export const ScheduleExtraSchema = z.object({
  id: z.string().uuid(),
  name: z.string().default(''),
  days: z.number().int().min(0).default(0),
});
export type ScheduleExtra = z.infer<typeof ScheduleExtraSchema>;

export const ScheduleStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  /**
   * `extras` to etap zbiorczy na usługi dodatkowe z cennika (T-64) — jeden na
   * wycenę. Wyróżniamy go polem, a nie nazwą, bo nazwę wolno zmienić.
   */
  kind: z.enum(['normal', 'extras']).default('normal'),
  /** Składniki etapu `extras`. Dla zwykłego etapu zawsze pusta. */
  extras: z.array(ScheduleExtraSchema).default([]),
  /**
   * Inwestor też „zużywa" czas: decyzje, zbieranie inspiracji, spotkania.
   * Bez tego rozróżnienia termin wychodzi optymistyczny w sposób, który
   * potem trudno wytłumaczyć klientowi — bo to ON go opóźnił.
   */
  owner: StageOwnerSchema,
  /** Dni niezależne od liczby pomieszczeń („cały projekt"). */
  baseDays: z.number().min(0).default(0),
  /** Dni doliczane za każde pomieszczenie danego typu. */
  perRoomDays: z.record(z.string(), z.number().min(0)).default({}),
  /** Stawka dla pomieszczenia spoza mapy (albo bez typu). */
  defaultPerRoomDays: z.number().min(0).default(0),
  /**
   * Które pomieszczenia liczą się do tego etapu. `none` = etap w ogóle nie
   * zależy od pomieszczeń, więc macierz się dla niego nie pokazuje.
   */
  roomScope: z.union([RoomScopeSchema, z.literal('none')]).default('none'),
  enabled: z.boolean().default(true),
  /**
   * Etykiety pozycji (F2.3), które **proponują** włączenie tego etapu.
   * Sam fakt, że w wycenie jest wizualizacja, nie włącza etapu po cichu —
   * o tym decyduje UI w F5.2, z możliwością cofnięcia.
   */
  linkedItemTags: z.array(z.string()).default([]),
});
export type ScheduleStage = z.infer<typeof ScheduleStageSchema>;

export const ScheduleBodySchema = z.object({
  /** Data rozpoczęcia (`YYYY-MM-DD`). Bez niej liczymy same dni, bez terminów. */
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data musi być w formacie RRRR-MM-DD')
    .nullable()
    .default(null),
  /** Dni roboczych w tygodniu — osobno dla każdej strony (arkusz: D7, D8). */
  providerWorkdaysPerWeek: z.number().int().min(1).max(7).default(5),
  clientWorkdaysPerWeek: z.number().int().min(1).max(7).default(5),
  stages: z.array(ScheduleStageSchema).default([]),
  /** `PL` uwzględnia dni ustawowo wolne; `none` liczy tylko dni tygodnia. */
  holidays: z.enum(['PL', 'none']).default('PL'),
});
export type ScheduleBody = z.infer<typeof ScheduleBodySchema>;

/**
 * Parsowanie harmonogramu z bazy (`quotes.schedule` jsonb, nullable).
 *
 * Miękko, tak jak `pricing` w bibliotece: harmonogram zapisany nowszą wersją
 * aplikacji albo ręcznie zepsuty ma nie wywalić całej wyceny. `null` znaczy
 * „ta wycena nie ma jeszcze harmonogramu" i jest w pełni poprawnym stanem.
 */
export function parseScheduleBody(raw: unknown): ScheduleBody | null {
  if (raw === null || raw === undefined) return null;
  const parsed = ScheduleBodySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
