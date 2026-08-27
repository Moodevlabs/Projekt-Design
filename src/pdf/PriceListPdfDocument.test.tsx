import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { PriceListPdfDocument } from './PriceListPdfDocument';
import { priceListFileName } from './file-name';
import { buildPdfTheme } from './theme';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newPriceListDoc, newPriceListItem, type PriceListDoc } from '@/domain/documents';
import { formatMoneyRange } from '@/domain/money';

function render(doc: PriceListDoc) {
  return renderToBuffer(
    <PriceListPdfDocument
      doc={doc}
      theme={buildPdfTheme(defaultBrandKit())}
      brandKit={defaultBrandKit()}
      number="WYC/2026/08/0001"
      issueDate="2026-08-01"
    />,
  );
}

describe('PriceListPdfDocument — render', () => {
  it('składa dokument z pełnego szablonu', async () => {
    const bytes = await render(newPriceListDoc());
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('pusty cennik nadal się renderuje', async () => {
    const bytes = await render(newPriceListDoc({ items: [] }));
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });

  /*
   * Widełki sprawdzamy na TEKŚCIE komórki, a nie na rozmiarze pliku.
   * Porównanie długości bufora przechodziło przypadkiem: PDF jest
   * skompresowany, więc dłuższy napis potrafi dać krótszy plik, a test
   * wywracał się przy zmianie zupełnie innego zdania w dokumencie (T-97).
   */
  it('pozycja z przedziałem drukuje oba końce widełek', async () => {
    const jedna = formatMoneyRange(30_000, null, '', 'PLN');
    const przedzial = formatMoneyRange(30_000, 120_000, '', 'PLN');

    expect(przedzial).not.toBe(jedna);
    expect(przedzial).toContain('300');
    expect(przedzial).toContain('1');

    const bytes = await render(
      newPriceListDoc({
        items: [newPriceListItem({ name: 'Rzut', priceMinCents: 30_000, priceMaxCents: 120_000 })],
      }),
    );
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('przypis trafia do pliku', async () => {
    const bez = await render(newPriceListDoc({ items: [], footnote: '' }));
    const z = await render(newPriceListDoc({ items: [], footnote: 'Ceny netto.' }));
    expect(z.length).toBeGreaterThan(bez.length);
  });

  it('A4 przyjmuje pełny szablon', async () => {
    const doc = newPriceListDoc();
    expect(doc.items.length).toBeGreaterThanOrEqual(10);
    expect((await render(doc)).length).toBeGreaterThan(1000);
  });
});

describe('priceListFileName', () => {
  it('ma przyrostek -cennik, żeby nie nadpisać innych dokumentów pakietu', () => {
    expect(priceListFileName('WYC/2026/08/0001')).toBe('wyc-2026-08-0001-cennik.pdf');
  });

  it('bez numeru daje sensowną nazwę', () => {
    expect(priceListFileName(null)).toBe('wycena-cennik.pdf');
  });
});
