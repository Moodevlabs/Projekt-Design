/**
 * Kolor w PDF: czytelność tekstu na tle marki.
 *
 * Użytkownik wybiera kolor akcentu dowolnie, a nagłówek dokumentu jest nim
 * wypełniony — na ciemnej terakocie tekst musi być jasny, na piaskowym beżu
 * ciemny. Bez tego nagłówek bywa nieczytelny na wydruku, czego nie widać
 * w edytorze.
 */

/** Rozkłada `#RRGGBB` na składowe 0–255. `null`, gdy to nie jest taki zapis. */
export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;

  const value = Number.parseInt(match[1]!, 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

/**
 * Luminancja względna wg WCAG 2.1 (0 = czerń, 1 = biel).
 *
 * Nie średnia arytmetyczna składowych: oko jest najczulsze na zieleń, więc
 * `#00FF00` jest dla nas jasny, a `#0000FF` ciemny, mimo tej samej „wartości".
 */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;

  const channel = (value: number) => {
    const sRGB = value / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Kontrast dwóch kolorów wg WCAG: od 1 (identyczne) do 21 (czerń/biel). */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Prawie czerń i prawie biel — czysty czarny na kolorze marki wygląda brudno. */
export const DARK_INK = '#21201C';
export const LIGHT_INK = '#FFFFFF';

/**
 * Kolor tekstu na podanym tle — ten z dwóch, który daje lepszy kontrast.
 *
 * Wybieramy przez porównanie kontrastu, a nie przez próg luminancji: przy
 * kolorach ze środka skali (np. `#7A7A7A`) próg zawsze wskazuje tę samą stronę,
 * a realnie czytelniejsza bywa druga.
 */
export function contrastText(background: string): typeof DARK_INK | typeof LIGHT_INK {
  return contrastRatio(background, DARK_INK) >= contrastRatio(background, LIGHT_INK)
    ? DARK_INK
    : LIGHT_INK;
}

/** Czy tło jest na tyle jasne, że logo w wersji jasnej na nim zniknie. */
export function isLightBackground(hex: string): boolean {
  return contrastText(hex) === DARK_INK;
}
