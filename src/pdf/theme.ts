import { contrastText, isLightBackground } from '@/domain/brand/color';
import type { BrandKit, FontFamily } from '@/domain/brand/schema';

/**
 * Brand kit → zestaw wartości, którymi steruje się arkuszem PDF.
 *
 * Osobna, czysta funkcja (nie hook, nie komponent), bo to jedyne miejsce, gdzie
 * decydujemy o czytelności dokumentu: kolor tekstu na nagłówku i wybór wariantu
 * logo wynikają z koloru marki, a nie z upodobań.
 */
export interface PdfTheme {
  accent: string;
  background: string;
  /** Tekst na tle `accent` — dobrany pod kontrast. */
  onAccent: string;
  ink: string;
  inkSoft: string;
  hair: string;
  discount: string;
  fontFamily: string;
  /** Który wariant logo położyć na nagłówku. */
  headerLogo: 'dark' | 'light';
  sizes: {
    title: number;
    sectionTitle: number;
    groupTitle: number;
    body: number;
    small: number;
    total: number;
  };
}

/**
 * Stałe kolory dokumentu — nie pochodzą z brand kitu, bo to nie jest wybór marki.
 *
 * Atrament zestrojony z `--ink` aplikacji (redesign 2026), żeby wydruk i ekran
 * mówiły tym samym brązem. `DISCOUNT` bez zmian: terakota rabatów była ciepła
 * od początku.
 */
const INK = '#33251E';
const INK_SOFT = '#74645A';
const HAIR = '#E4DCD4';
const DISCOUNT = '#B9634A';

/**
 * Nazwa rodziny dla `@react-pdf`. Gdy plików `.ttf` dla TEGO kroju nie ma
 * w repo, zwracamy wbudowaną `Helvetica` — dokument się wyrenderuje, ale
 * **bez polskich znaków**. Patrz `fonts/register.ts`.
 */
export function pdfFontFamily(font: FontFamily, registered: boolean): string {
  return registered ? font : 'Helvetica';
}

/**
 * Który wariant logo trafia na pas nagłówka.
 *
 * Wydzielone z `buildPdfTheme`, bo tę samą odpowiedź musi znać podgląd
 * w ustawieniach — a dwie kopie tej decyzji rozjechałyby się przy pierwszej
 * zmianie i strona brandingu kłamałaby dokładnie w tym, po co się na nią patrzy.
 *
 * Wybór użytkownika (`light` / `dark`) wygrywa z regułą kontrastu. `auto` to
 * reguła: na jasnym pasie jasne logo zniknie, więc bierzemy ciemne.
 */
export function headerLogoVariant(brandKit: BrandKit): 'dark' | 'light' {
  if (brandKit.headerLogo !== 'auto') return brandKit.headerLogo;
  return isLightBackground(brandKit.accentColor) ? 'dark' : 'light';
}

export function buildPdfTheme(brandKit: BrandKit, fontsRegistered = false): PdfTheme {
  const accent = brandKit.accentColor;

  return {
    accent,
    background: brandKit.bgColor,
    onAccent: contrastText(accent),
    ink: INK,
    inkSoft: INK_SOFT,
    hair: HAIR,
    discount: DISCOUNT,
    fontFamily: pdfFontFamily(brandKit.fontFamily, fontsRegistered),
    headerLogo: headerLogoVariant(brandKit),
    sizes: {
      title: 22,
      sectionTitle: 12,
      groupTitle: 9,
      body: 10,
      small: 8.5,
      total: 18,
    },
  };
}
