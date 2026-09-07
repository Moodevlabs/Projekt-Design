import type { HeaderLogoChoice } from './schema';

/** Tyle brand kitu, ile trzeba do wybrania pliku logo. */
export interface LogoPaths {
  logoDarkPath: string | null;
  logoLightPath: string | null;
}

/**
 * Ścieżka logo na nagłówek PDF: wybrany wariant, a gdy go nie ma — drugi.
 *
 * Do 2026-09-07 brak wybranego wariantu znaczył **brak logo w ogóle**:
 * użytkownik wgrywał swój jedyny plik w pole „ciemne", nagłówek miał
 * ustawione „jasne" (albo odwrotnie) i oferta wychodziła z samą nazwą
 * firmy, bez żadnego komunikatu. Znak w niewłaściwym odcieniu jest gorszy
 * niż właściwy, ale lepszy niż pusty pas — a ustawienia i tak pokazują
 * ostrzeżenie „brak wariantu na nagłówek" (`BrandSettingsPage`, `missing`).
 */
export function pickHeaderLogoPath(kit: LogoPaths, variant: HeaderLogoChoice): string | null {
  const preferred = variant === 'dark' ? kit.logoDarkPath : kit.logoLightPath;
  const other = variant === 'dark' ? kit.logoLightPath : kit.logoDarkPath;
  return preferred ?? other;
}
