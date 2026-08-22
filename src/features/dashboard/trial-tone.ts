/**
 * Barwa paska okresu próbnego: zielona na starcie, przez bursztyn, do
 * czerwieni w ostatnich dniach. Im bliżej końca, tym cieplej — kolor jest
 * drugim, „przedjęzykowym" sygnałem obok liczby dni w tekście.
 *
 * Interpolacja jest dwuodcinkowa (zieleń → bursztyn → czerwień), bo prosta
 * między zielenią a czerwienią przechodzi przez brudną oliwkę.
 */
const GREEN = '#2c7a51';
const AMBER = '#de8b2c';
const RED = '#c0392b';

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
  if (totalDays <= 0) return RED;

  const left = Math.min(totalDays, Math.max(0, daysLeft));
  const ratio = left / totalDays;

  // Górna połowa zapasu: zieleń stygnie do bursztynu.
  if (ratio >= 0.5) return mix(AMBER, GREEN, (ratio - 0.5) * 2);
  // Dolna połowa: bursztyn przechodzi w czerwień.
  return mix(RED, AMBER, ratio * 2);
}
