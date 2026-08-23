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

/** Stałe kolory dokumentu — nie pochodzą z brand kitu, bo to nie jest wybór marki. */
const INK = '#21201C';
const INK_SOFT = '#6B6862';
const HAIR = '#E3DFD7';
const DISCOUNT = '#B9634A';

/**
 * Nazwa rodziny dla `@react-pdf`. Gdy plików `.ttf` dla TEGO kroju nie ma
 * w repo, zwracamy wbudowaną `Helvetica` — dokument się wyrenderuje, ale
 * **bez polskich znaków**. Patrz `fonts/register.ts`.
 */
export function pdfFontFamily(font: FontFamily, registered: boolean): string {
  return registered ? font : 'Helvetica';
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
    // Na jasnym nagłówku jasne logo zniknie — bierzemy ciemny wariant.
    headerLogo: isLightBackground(accent) ? 'dark' : 'light',
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
