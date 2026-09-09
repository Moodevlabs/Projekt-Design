/**
 * Obietnica z limitem czasu.
 *
 * Powstało przy eksporcie PDF (2026-09-09): kilka kroków przed dialogiem
 * zapisu — podpisanie URL logo, pobranie go, archiwizacja w Supabase —
 * potrafiło **nigdy nie odpowiedzieć** (zawieszone odświeżenie sesji po
 * uśpieniu komputera). Eksport nie rzucał błędu, więc nie było toastu,
 * a pozycje menu zostawały wyszarzone bez końca. Limit zamienia „nic się nie
 * dzieje" w konkretny komunikat, po którym da się spróbować jeszcze raz.
 *
 * Samej pracy NIE przerywa — `fetch` czy upload lecą dalej w tle. Chodzi
 * o to, żeby interfejs nie czekał na nie w nieskończoność.
 */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
