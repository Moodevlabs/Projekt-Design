import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Scalanie gotowych PDF-ów w jeden plik (F6.3).
 *
 * `pdf-lib` zamiast czegokolwiek innego: `@react-pdf` renderuje **jeden**
 * dokument na wywołanie i nie umie doszyć stron do cudzego pliku. Alternatywą
 * byłoby renderowanie całego pakietu jako jednego `<Document>` z czterema
 * `<Page>` — czyli zlanie czterech dokumentów o różnej ważności i różnym
 * przeznaczeniu w jeden byt, tylko po to, żeby uniknąć zależności. `pdf-lib`
 * jest czystym JS-em, bez binarki i bez procesu w tle, więc działa w webview
 * tak samo jak w teście.
 */

/** Odległość numeru strony od krawędzi — ta sama, co stopka w dokumentach. */
const MARGIN = 46;
const BOTTOM = 20;

export interface MergeOptions {
  /**
   * Podpis numeru strony, np. `(3, 12) => '3 / 12'`.
   *
   * **Tylko znaki WinAnsi** — numery rysuje wbudowana Helvetica, która nie ma
   * polskich diakrytyków. „Strona 3 z 12" jest bezpieczne, „Strona 3 z 12 —
   * załącznik" już nie.
   */
  pageLabel?: (page: number, total: number) => string;
}

/**
 * Scala PDF-y w kolejności, w jakiej przyszły, i numeruje strony **ciągle**
 * przez cały plik.
 *
 * Numeracja jest sednem trybu „jeden plik": cztery dokumenty z własnymi
 * numeracjami od jedynki to nie pakiet, tylko cztery pliki w jednej kopercie.
 */
export async function mergePdfs(
  parts: Uint8Array[],
  { pageLabel }: MergeOptions = {},
): Promise<Uint8Array> {
  // Pusty pakiet to blad wolajacego, nie wynik: `pdf-lib` po zapisie i
  // ponownym odczycie robi z dokumentu bez stron **jedna pusta strone**,
  // a biala kartka wyslana inwestorowi jest gorsza niz odmowa.
  if (parts.length === 0) throw new Error('Pakiet bez dokumentow');

  const out = await PDFDocument.create();

  for (const part of parts) {
    // `new Uint8Array(part)` nie jest ozdobnikiem: `pdf-lib` sprawdza typ przez
    // `instanceof`, a bajty przychodzace z innego realmu (Node `Buffer`,
    // wynik z Web Workera) tego testu nie przechodza i leca jako „typ NaN".
    const source = await PDFDocument.load(new Uint8Array(part));
    const pages = await out.copyPages(source, source.getPageIndices());
    for (const page of pages) out.addPage(page);
  }

  if (pageLabel) {
    const font = await out.embedFont(StandardFonts.Helvetica);
    const pages = out.getPages();

    pages.forEach((page, index) => {
      const text = pageLabel(index + 1, pages.length);
      const size = 7.5;
      const width = font.widthOfTextAtSize(text, size);

      // Prawy dolny rog: lewy zajmuje stopka z brand kitu.
      page.drawText(text, {
        x: page.getWidth() - MARGIN - width,
        y: BOTTOM,
        size,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    });
  }

  return out.save();
}
