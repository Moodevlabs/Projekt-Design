/**
 * Barwa paska okresu próbnego: oliwka na starcie, przez ochrę, do terakoty
 * w ostatnich dniach. Im bliżej końca, tym cieplej — kolor jest drugim,
 * „przedjęzykowym" sygnałem obok liczby dni w tekście.
 *
 * Interpolacja jest dwuodcinkowa (oliwka → ochra → terakota), bo prosta
 * między nimi przechodzi przez brudną szarozieleń.
 *
 * ⚠️ **Te trzy kotwice są kopiami `--positive` / `--warning` / `--danger`
 * z `globals.css` i muszą chodzić z nimi w parze.** Nie da się ich zastąpić
 * `var(--…)`: funkcja interpoluje kanały RGB w JavaScripcie i musi dostać
 * konkretne liczby, a nie nazwę zmiennej CSS rozwiązywaną dopiero przez
 * przeglądarkę. Duplikat jest tu świadomy, nie przeoczony.
 */
const OLIVE = '#4a6340';
const OCHRE = '#b07d2c';
const TERRACOTTA = '#a8402f';

function parseHex(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function toHex(channel: number): string {
  return Math.round(channel).toString(16).padStart(2, '0');
}

function mix(from: string, to: string, amount: number): string {
  const [r1, g1, b1] = parseHex(from);
  const [r2, g2, b2] = parseHex(to);
  const t = Math.min(1, Math.max(0, amount));
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
}

/**
 * @param daysLeft dni pozostałe do końca okresu próbnego
 * @param totalDays długość okresu próbnego
 */
export function trialTone(daysLeft: number, totalDays: number): string {
  if (totalDays <= 0) return TERRACOTTA;

  const left = Math.min(totalDays, Math.max(0, daysLeft));
  const ratio = left / totalDays;

  // Górna połowa zapasu: oliwka ciepleje do ochry.
  if (ratio >= 0.5) return mix(OCHRE, OLIVE, (ratio - 0.5) * 2);
  // Dolna połowa: ochra przechodzi w terakotę.
  return mix(TERRACOTTA, OCHRE, ratio * 2);
}
