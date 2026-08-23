/**
 * Formatowanie czasu pracy (F2.2).
 *
 * Minuty trzymamy jako liczbę całkowitą — tak jak grosze. Zamiana na
 * „18 h 20 min" jest wyłącznie prezentacją i dlatego siedzi w jednym miejscu.
 */

const MINUTES_PER_HOUR = 60;

/**
 * „18 h 20 min", „45 min", „3 h".
 *
 * Pełne godziny pokazujemy bez „0 min" — dopisek nic nie wnosi, a wydłuża
 * liczbę, która ma być czytana jednym rzutem oka. Zero minut to „0 min",
 * a nie pusty tekst: brak wartości i zero to dwie różne informacje.
 */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / MINUTES_PER_HOUR);
  const rest = total % MINUTES_PER_HOUR;

  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
