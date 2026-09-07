import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import { QuotePdfDocument } from './QuotePdfDocument';
import { SchedulePdfDocument } from './SchedulePdfDocument';
import { StagesPdfDocument } from './StagesPdfDocument';
import { PriceListPdfDocument } from './PriceListPdfDocument';
import { mergePdfs } from './merge';
import { buildPdfTheme } from './theme';
import { sampleQuoteBody } from './sample-quote';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newScheduleBody } from '@/domain/schedule';
import { newPriceListDoc, newStagesDoc } from '@/domain/documents';

const theme = buildPdfTheme(defaultBrandKit());
const wspolne = {
  theme,
  brandKit: defaultBrandKit(),
  number: 'WYC/2026/08/0001',
  issueDate: '2026-08-01',
};

/** Wszystkie cztery dokumenty pakietu, tak jak sklada je `usePackageExport`. */
async function renderPakiet(): Promise<Uint8Array[]> {
  const body = sampleQuoteBody();

  // `renderToBuffer`, a nie `pdf().toBlob()` jak w hooku: w Node `Blob`
  // z `@react-pdf` nie ma `arrayBuffer()`. Renderowana jest ta sama tresc.
  return Promise.all([
    // Jak w pakiecie: wycena BEZ własnego „n / N" — numeruje `mergePdfs`.
    renderToBuffer(
      <QuotePdfDocument body={body} currency="PLN" pageNumbers={false} {...wspolne} />,
    ),
    renderToBuffer(
      <SchedulePdfDocument
        schedule={newScheduleBody({ startDate: '2026-09-01' })}
        rooms={body.rooms}
        validDays={7}
        {...wspolne}
      />,
    ),
    renderToBuffer(<StagesPdfDocument doc={newStagesDoc()} {...wspolne} />),
    renderToBuffer(<PriceListPdfDocument doc={newPriceListDoc()} {...wspolne} />),
  ]);
}

describe('pakiet dokumentów (F6.3) — cztery dokumenty w jednym pliku', () => {
  it('scala wycenę, termin, etapy i cennik z ciągłą numeracją', async () => {
    const czesci = await renderPakiet();
    expect(czesci).toHaveLength(4);

    const etykiety: string[] = [];
    const pakiet = await mergePdfs(czesci, {
      pageLabel: (page, total) => {
        const text = `${page} / ${total}`;
        etykiety.push(text);
        return text;
      },
    });

    const scalony = await PDFDocument.load(pakiet);
    const stronOsobno = await Promise.all(
      czesci.map(async (part) => (await PDFDocument.load(new Uint8Array(part))).getPageCount()),
    );

    // Zadna strona nie ginie i zadna nie dubluje sie przy scalaniu.
    expect(scalony.getPageCount()).toBe(stronOsobno.reduce((sum, count) => sum + count, 0));
    expect(etykiety).toHaveLength(scalony.getPageCount());
    expect(etykiety.at(-1)).toBe(`${scalony.getPageCount()} / ${scalony.getPageCount()}`);
  }, 60_000);

  it('wycena w pakiecie nie drukuje własnej numeracji — numeruje tylko scalanie', async () => {
    /*
     * Do 2026-09-07 wycena miała własne „1 / 3" w prawym dolnym rogu, a
     * `mergePdfs` dorysowywało tam „1 / 12" — dwa napisy jeden na drugim.
     * Sprawdzamy, że oba warianty się składają i mają tyle samo stron: to
     * TEN SAM dokument, różni się tylko stopką.
     */
    const body = sampleQuoteBody();
    const [zNumeracja, bez] = await Promise.all([
      renderToBuffer(<QuotePdfDocument body={body} currency="PLN" {...wspolne} />),
      renderToBuffer(
        <QuotePdfDocument body={body} currency="PLN" pageNumbers={false} {...wspolne} />,
      ),
    ]);
    const stronA = (await PDFDocument.load(new Uint8Array(zNumeracja))).getPageCount();
    const stronB = (await PDFDocument.load(new Uint8Array(bez))).getPageCount();
    expect(stronB).toBe(stronA);
    // Bez numeracji plik jest krótszy o same napisy stopki — nie dłuższy.
    expect(bez.byteLength).toBeLessThanOrEqual(zNumeracja.byteLength);
  }, 60_000);

  it('mieści się w rozsądnym czasie', async () => {
    /*
     * Kryterium T-48 mowi „< 5 s". Tutaj asercja jest LUZNA (30 s), bo
     * zegar scienny w CI zalezy od obciazenia maszyny i twardy prog robilby
     * z tego testu loterie. Ten test lapie katastrofe (render, ktory nagle
     * trwa minuty), a nie regresje o 200 ms. Zmierzony czas trafia do notatki
     * zadania w `06-TASKS.md`.
     */
    const start = performance.now();
    await mergePdfs(await renderPakiet(), { pageLabel: (p, t) => `${p} / ${t}` });
    const czas = performance.now() - start;

    expect(czas).toBeLessThan(30_000);
  }, 60_000);
});
