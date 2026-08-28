import { contrastText } from '@/domain/brand/color';
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
    /**
     * Napis „wycena indywidualna" w kolumnie kwoty.
     *
     * Osobny rozmiar, bo to jedyny tekst, który musi zmieścic sie w 90 pt
     * kolumny kwoty w JEDNEJ linii. W rozmiarze `body` nie miescil sie i
     * `@react-pdf` lamal go przez dywiz w srodku wyrazu („indywidual-na"),
     * co w dokumencie wychodzacym do inwestora wyglada na blad skladu.
     */
    individual: number;
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
 * Od wycofania doboru automatycznego (2026-08-28) to zwykłe przepisanie
 * ustawienia: program nie liczy już kontrastu za użytkownika. Funkcja zostaje,
 * bo to nadal JEDNO miejsce, przez które pytają o tę odpowiedź generator PDF
 * i podgląd w ustawieniach — a dwie kopie rozjechałyby się przy pierwszej
 * zmianie i strona brandingu kłamałaby w tym, po co się na nią patrzy.
 */
export function headerLogoVariant(brandKit: BrandKit): 'dark' | 'light' {
  return brandKit.headerLogo;
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
      individual: 7.5,
      total: 18,
    },
  };
}
