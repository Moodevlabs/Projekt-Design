import { beforeAll, describe, expect, it, vi } from 'vitest';

const register = vi.hoisted(() => vi.fn());
vi.mock('@react-pdf/renderer', () => ({ Font: { register } }));

const { FONT_FILES, allPdfFontsRegistered, isPdfFontRegistered, registerPdfFonts } =
  await import('./register');

beforeAll(() => {
  registerPdfFonts();
});

describe('rejestracja fontów', () => {
  it('komplet krojów ma pliki w repo', () => {
    /*
     * Ten test pilnuje POLSKICH ZNAKÓW w ofercie.
     *
     * Bez pliku `.ttf` `@react-pdf` spada na wbudowaną Helveticę, która nie ma
     * „ą", „ł" ani „ż" — oferta wychodzi z dziurami w nazwisku klienta.
     * Usunięcie albo przemianowanie pliku fontu jest zmianą cichą: nic się nie
     * wywala, dopóki ktoś nie otworzy PDF-a. Dlatego sprawdzamy to testem.
     */
    const brakujace = (Object.keys(FONT_FILES) as (keyof typeof FONT_FILES)[]).filter(
      (family) => !isPdfFontRegistered(family),
    );

    expect(brakujace, 'brakuje plików .ttf — patrz FONT_FILES').toEqual([]);
    expect(allPdfFontsRegistered()).toBe(true);
  });

  it('każdy krój dostaje wagę 400 i 700', () => {
    // `@react-pdf` nie syntezuje pogrubienia: bez osobnego pliku 700 nagłówki
    // wyszłyby w zwykłej grubości, mimo `fontWeight: 700` w stylach.
    for (const [family] of Object.entries(FONT_FILES)) {
      const call = register.mock.calls.find(
        ([args]) => (args as { family: string }).family === family,
      );
      expect(call, family).toBeDefined();

      const wagi = (call?.[0] as { fonts: { fontWeight: number }[] }).fonts.map(
        (f) => f.fontWeight,
      );
      expect(wagi, family).toEqual([400, 700]);
    }
  });

  it('rejestruje raz, nawet przy wielokrotnym wywołaniu', () => {
    // `@react-pdf` trzyma własny rejestr — powtórka nadpisuje wpis i marnuje
    // czas przy każdym renderze.
    const przed = register.mock.calls.length;
    registerPdfFonts();
    registerPdfFonts();

    expect(register.mock.calls.length).toBe(przed);
  });
});
