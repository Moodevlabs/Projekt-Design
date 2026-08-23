import { describe, expect, it } from 'vitest';
import { buildPdfTheme, pdfFontFamily } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { contrastRatio } from '@/domain/brand/color';

describe('buildPdfTheme', () => {
  it('dobiera kolor tekstu naglowka pod kontrast', () => {
    const ciemny = buildPdfTheme({ ...defaultBrandKit(), accentColor: '#21201C' });
    const jasny = buildPdfTheme({ ...defaultBrandKit(), accentColor: '#FAF7F1' });

    // Naglowek jest wypelniony kolorem marki — tekst musi byc na nim czytelny
    // takze na wydruku, czego nie widac w edytorze.
    expect(contrastRatio(ciemny.accent, ciemny.onAccent)).toBeGreaterThan(4.5);
    expect(contrastRatio(jasny.accent, jasny.onAccent)).toBeGreaterThan(4.5);
    expect(ciemny.onAccent).not.toBe(jasny.onAccent);
  });

  it('na jasnym akcencie bierze CIEMNY wariant logo', () => {
    // Jasne logo na jasnym tle znikneloby.
    expect(buildPdfTheme({ ...defaultBrandKit(), accentColor: '#FAF7F1' }).headerLogo).toBe('dark');
    expect(buildPdfTheme({ ...defaultBrandKit(), accentColor: '#21201C' }).headerLogo).toBe('light');
  });

  it('przepisuje kolory marki bez zmian', () => {
    const theme = buildPdfTheme({
      ...defaultBrandKit(),
      accentColor: '#B9634A',
      bgColor: '#FFFFFF',
    });

    expect(theme.accent).toBe('#B9634A');
    expect(theme.background).toBe('#FFFFFF');
  });
});

describe('pdfFontFamily', () => {
  it('uzywa kroju marki, gdy fonty sa zarejestrowane', () => {
    expect(pdfFontFamily('Playfair', true)).toBe('Playfair');
  });

  it('bez plikow fontow spada na Helvetice', () => {
    // Wtedy PDF nie ma polskich znakow — patrz `fonts/register.ts`.
    expect(pdfFontFamily('Playfair', false)).toBe('Helvetica');
  });

  it('domyslnie zaklada BRAK fontow', () => {
    // Bezpieczniejszy domysl: lepiej wyrenderowac Helvetica niz odwolac sie do
    // kroju, ktorego `@react-pdf` nie zna, i wywalic render.
    expect(buildPdfTheme(defaultBrandKit()).fontFamily).toBe('Helvetica');
  });

  it('uzywa kroju z brand kitu, gdy jego pliki sa dostepne', () => {
    // Decyzja jest PER KROJ. Wczesniej wystarczylo, ze brakuje jednego z pieciu,
    // i wszystkie — lacznie z wgranymi — spadaly na Helvetice; wrzucenie plikow
    // wygladalo wtedy na dzialanie bez efektu.
    const kit = { ...defaultBrandKit(), fontFamily: 'Inter' as const };
    expect(buildPdfTheme(kit, true).fontFamily).toBe('Inter');
    expect(buildPdfTheme(kit, false).fontFamily).toBe('Helvetica');
  });
});
