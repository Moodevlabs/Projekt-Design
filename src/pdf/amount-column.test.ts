import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as fontkit from 'fontkit';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { pl } from '@/i18n/pl';

/**
 * Szerokość kolumny kwoty w `QuotePdfDocument` (`styles.rowAmount`).
 * Trzymana tutaj ręcznie, bo `StyleSheet.create` z `@react-pdf` nie oddaje
 * wartości w formie, którą dałoby się odczytać w teście.
 */
const COLUMN_PT = 90;

/**
 * Napis „wycena indywidualna" a szerokość kolumny kwoty.
 *
 * ## Dlaczego akurat to mierzymy
 *
 * To JEDYNY tekst w dokumencie, który musi zmieścić się w sztywnej kolumnie
 * i nie da się go skrócić — kwoty są krótkie z natury, a ten napis ma
 * dziewiętnaście znaków. W rozmiarze `body` (10 pt) nie mieścił się i
 * `@react-pdf` łamał go przez dywiz w środku wyrazu („wycena indywidual-na"),
 * co w ofercie idącej do inwestora wygląda na błąd składu.
 *
 * Test liczy szerokość **prawdziwymi metrykami** każdego kroju wgranego do
 * repozytorium, bo użytkownik wybiera font w ustawieniach marki i zmiana
 * z Lato na Source Serif potrafi dołożyć kilkanaście procent szerokości.
 * Złapie zarówno wydłużenie napisu w `pl.ts`, jak i podniesienie rozmiaru
 * w `theme.ts` czy dorzucenie szerszego kroju.
 */
describe('kolumna kwoty w ofercie', () => {
  const fontsDir = join(process.cwd(), 'src/pdf/fonts');
  const files = readdirSync(fontsDir).filter((name) => name.endsWith('.ttf'));

  it('ma z czego brac miary — fonty leza w repozytorium', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('„wycena indywidualna" miesci sie w jednej linii: %s', (file) => {
    const font = fontkit.create(readFileSync(join(fontsDir, file)));
    if (!('layout' in font)) throw new Error(`${file} nie jest pojedynczym krojem`);

    const size = buildPdfTheme(defaultBrandKit()).sizes.individual;
    const widthPt = (font.layout(pl.pdf.individualPrice).advanceWidth / font.unitsPerEm) * size;

    expect(widthPt).toBeLessThan(COLUMN_PT);
  });
});
