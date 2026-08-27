import { z } from 'zod';

/**
 * Wizja lokalna (T-94, poprawka 10 z 2026-08-27).
 *
 * ## Czym jest w zawodzie
 *
 * Pierwsza wizyta na miejscu: obmiar, spis instalacji, zdjęcia stanu
 * zastanego, lista rzeczy do sprawdzenia. Jedyny zapis tego, **jak było,
 * zanim ktokolwiek czegokolwiek dotknął** — i dlatego wraca się do niej przez
 * cały projekt.
 *
 * ## Dwie decyzje modelu
 *
 * 1. **Wymiary w centymetrach, całkowite.** Ta sama zasada co przy
 *    pieniądzach (CLAUDE.md §8): liczby całkowite w najmniejszej jednostce,
 *    przeliczenie wyłącznie w prezentacji. „3,45 m" wpisane jako float
 *    prędzej czy później da 3.4499999999999997 w polu obmiaru.
 * 2. **Stan instalacji ma TRZY wartości, nie dwie.** „Jest / nie ma" nie
 *    opisuje rzeczywistości budowy: najczęstsza odpowiedź brzmi „jest, ale
 *    do wymiany". Sprowadzenie tego do checkboxa kasuje jedyną informację,
 *    która ma konsekwencje kosztowe.
 */

export const RoomMeasurementSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(''),
  /** Wymiary w centymetrach. `null` = nie zmierzono. */
  lengthCm: z.number().int().nonnegative().nullable().default(null),
  widthCm: z.number().int().nonnegative().nullable().default(null),
  heightCm: z.number().int().nonnegative().nullable().default(null),
  note: z.string().default(''),
});
export type RoomMeasurement = z.infer<typeof RoomMeasurementSchema>;

/**
 * Stan sprawdzanego elementu.
 *
 * `unknown` jest wartością domyślną i **nie jest brakiem odpowiedzi**: znaczy
 * „byłem na miejscu i nie dało się tego ustalić", co na budowie zdarza się
 * stale (zakryte piony, brak dokumentacji, nieobecny wykonawca).
 */
export const CheckStateSchema = z.enum(['ok', 'replace', 'missing', 'unknown']);
export type CheckState = z.infer<typeof CheckStateSchema>;

export const SiteCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().default(''),
  state: CheckStateSchema.default('unknown'),
  note: z.string().default(''),
});
export type SiteCheck = z.infer<typeof SiteCheckSchema>;

export const SiteVisitSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  /** Data WIZYTY, nie utworzenia wpisu (`YYYY-MM-DD`). */
  visitedAt: z.string(),
  attendees: z.string().default(''),
  rooms: z.array(RoomMeasurementSchema).default([]),
  checks: z.array(SiteCheckSchema).default([]),
  notes: z.string().default(''),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SiteVisit = z.infer<typeof SiteVisitSchema>;

/**
 * Powierzchnia pomieszczenia w m², policzona z obmiaru.
 *
 * `null`, gdy brakuje któregoś wymiaru — zero wyglądałoby jak wynik pomiaru,
 * a jest brakiem pomiaru. Zaokrąglamy do dwóch miejsc: centymetry dają
 * dokładność, której podłoga i tak nie ma.
 */
export function roomAreaM2(room: RoomMeasurement): number | null {
  if (room.lengthCm === null || room.widthCm === null) return null;
  const m2 = (room.lengthCm / 100) * (room.widthCm / 100);
  return Math.round(m2 * 100) / 100;
}

/** Suma powierzchni zmierzonych pomieszczeń. Pomija te bez kompletu wymiarów. */
export function totalAreaM2(rooms: readonly RoomMeasurement[]): number {
  const sum = rooms.reduce((acc, room) => acc + (roomAreaM2(room) ?? 0), 0);
  return Math.round(sum * 100) / 100;
}

/** Ile pozycji spisu ma jeszcze stan „nie ustalono". */
export function unresolvedChecks(checks: readonly SiteCheck[]): number {
  return checks.filter((check) => check.state === 'unknown').length;
}

/**
 * Wbudowany spis rzeczy do sprawdzenia na wizji.
 *
 * Kolejność jest kolejnością obchodu: od tego, co widać od progu, przez
 * instalacje, po rzeczy, które trzeba ustalić z zewnątrz (wspólnota, warunki
 * techniczne). Lista jest **punktem wyjścia, nie formularzem** — pozycje da
 * się dopisać i usunąć, bo każda inwestycja ma swoje.
 */
export const DEFAULT_SITE_CHECKS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'sciany', label: 'Ściany — pion, tynki, wilgoć' },
  { id: 'podlogi', label: 'Podłogi — poziom, wylewka, stan' },
  { id: 'sufity', label: 'Sufity — wysokość, obniżenia, belki' },
  { id: 'okna', label: 'Okna — stan, wymiary, kierunki świata' },
  { id: 'drzwi', label: 'Drzwi wejściowe i wewnętrzne' },
  { id: 'elektryka', label: 'Instalacja elektryczna — rozdzielnica, punkty' },
  { id: 'hydraulika', label: 'Instalacja wodno-kanalizacyjna — piony, podejścia' },
  { id: 'ogrzewanie', label: 'Ogrzewanie — źródło, grzejniki, podłogówka' },
  { id: 'wentylacja', label: 'Wentylacja i kominy' },
  { id: 'klimatyzacja', label: 'Klimatyzacja / rekuperacja' },
  { id: 'nosne', label: 'Ściany nośne i możliwość wyburzeń' },
  { id: 'przylacza', label: 'Przyłącza: gaz, internet, domofon' },
  { id: 'dostep', label: 'Dostęp: winda, klatka, miejsce na materiały' },
  { id: 'wspolnota', label: 'Zgody wspólnoty / warunki techniczne' },
];
