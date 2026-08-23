import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Font, renderToBuffer } from '@react-pdf/renderer';
import { QuotePdfDocument } from './QuotePdfDocument';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';

/**
 * Polskie znaki w PDF (04-PDF, kryterium odbioru T-13).
 *
 * `@react-pdf` bez zarejestrowanego pliku `.ttf` renderuje wbudowaną
 * Helveticą, która **nie ma polskich znaków** — „Zażółć" wychodzi z dziurami.
 * To awaria cicha: nic się nie wywala, a wadę widać dopiero w otwartym pliku
 * u klienta.
 *
 * **Fonty rejestrujemy tu ze ścieżek na dysku, a nie przez `registerPdfFonts()`.**
 * Produkcyjna rejestracja bierze adresy z `import.meta.glob(…, '?url')`, czyli
 * `/src/pdf/fonts/Inter-Regular.ttf` — adres poprawny w przeglądarce, ale
 * w Node `@react-pdf` próbuje otworzyć go jako ścieżkę pliku i dostaje ENOENT.
 * Dlatego podział jest taki: `fonts/register.test.ts` pilnuje, że pliki są
 * i że każdy krój dostaje wagi 400/700, a ten plik sprawdza to, czego tamten
 * nie może — że font naprawdę **osadza się** w dokumencie.
 */
// Sciezka od katalogu projektu, nie od `import.meta.url` — w jsdom ten drugi
// nie jest adresem `file:` i `fileURLToPath` sie na nim wywala.
const FONTS_DIR = resolve(process.cwd(), 'src/pdf/fonts');

function registerFromDisk(family: 'Inter' | 'Lato', regular: string, bold: string) {
  Font.register({
    family,
    fonts: [
      { src: resolve(FONTS_DIR, regular), fontWeight: 400 },
      { src: resolve(FONTS_DIR, bold), fontWeight: 700 },
    ],
  });
}

async function render(fontFamily: 'Inter' | 'Lato', useFonts: boolean) {
  const kit = { ...defaultBrandKit(), fontFamily };

  const body = newQuoteBody({
    title: 'Zażółć gęślą jaźń ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż',
    client: { name: 'Łukasz Świderski', phone: '', email: '' },
    sections: [
      newSection({
        title: 'Wykończenie wnętrz',
        items: [newItem({ name: 'Ścianka działowa — gipsokarton', unitPriceCents: 120_000 })],
      }),
    ],
  });

  return renderToBuffer(
    <QuotePdfDocument
      body={body}
      theme={buildPdfTheme(kit, useFonts)}
      brandKit={kit}
      number="WYC/2026/08/0001"
      issueDate="2026-08-01"
      currency="PLN"
    />,
  );
}

describe('polskie znaki w PDF', () => {
  it('krój z brand kitu jest OSADZONY w pliku', async () => {
    registerFromDisk('Inter', 'Inter-Regular.ttf', 'Inter-Bold.ttf');
    const raw = Buffer.from(await render('Inter', true)).toString('latin1');

    // Nazwa kroju w pliku znaczy, że font został osadzony (jako podzbiór,
    // zwykle z prefiksem `AAAAAA+`), a nie podmieniony na Helveticę.
    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toMatch(/Inter/);
  });

  it('działa dla innego kroju z listy, nie tylko domyślnego', async () => {
    registerFromDisk('Lato', 'Lato-Regular.ttf', 'Lato-Bold.ttf');
    expect(Buffer.from(await render('Lato', true)).toString('latin1')).toMatch(/Lato/);
  });

  it('bez fontu dokument leci Helveticą — i to widać', async () => {
    // Kontrola negatywna: gdyby asercje wyżej przechodziły zawsze, ta też by
    // przeszła. Ma nie przejść, jeśli rozróżnienie nie działa.
    const raw = Buffer.from(await render('Inter', false)).toString('latin1');

    expect(raw).toMatch(/Helvetica/);
    expect(raw).not.toMatch(/\+Inter/);
  });
});
