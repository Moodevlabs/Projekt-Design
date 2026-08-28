import { createLogger } from '@/lib/logger';

const log = createLogger('pdf.rasterize');

/** Jedna strona dokumentu zamieniona na obrazek. */
export interface RasterPage {
  /** `data:image/png;base64,…` — gotowe do wstawienia w `<img src>`. */
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Ile stron rysujemy w podglądzie.
 *
 * Podgląd brandingu odpowiada na pytanie „czy moja marka dobrze wygląda na
 * dokumencie", a odpowiedź widać na pierwszych stronach. Rysowanie
 * dwudziestostronicowej oferty przy każdej zmianie koloru kosztowałoby
 * sekundy, których w tym miejscu nikt nie ma ochoty czekać.
 */
const MAX_PAGES = 3;

/** Skala renderu — dwukrotność punktu PDF, żeby tekst nie był rozmyty na Retinie. */
const SCALE = 2;

/**
 * PDF → obrazki stron.
 *
 * ## Po co to w ogóle istnieje
 *
 * Podgląd oferty w ustawieniach brandingu był osadzony jako
 * `<object type="application/pdf">`. Na Windows i w `pnpm dev` przeglądarka ma
 * wbudowany czytnik PDF i to działa; **WKWebView, na którym Tauri stoi na
 * macOS, PDF-ów w ramkach nie renderuje w ogóle** — i nie zgłasza przy tym
 * błędu. Stąd „białe pole": dokument powstawał poprawnie, tylko nie miał go
 * co wyświetlić.
 *
 * Rysujemy więc strony sami, na `<canvas>`, i pokazujemy zwykłe obrazki. Ta
 * droga jest identyczna na każdym systemie, więc podgląd przestaje zależeć od
 * tego, co akurat potrafi wbudowana przeglądarka.
 *
 * `pdfjs-dist` ładujemy dynamicznie: to kilkaset kilobajtów, których nie ma po
 * co wciągać do ekranów, gdzie nikt podglądu nie otworzy.
 */
export async function rasterizePdf(bytes: Uint8Array): Promise<RasterPage[]> {
  const pdfjs = await loadPdfjs();

  // `getDocument` przejmuje bufor na własność i po zakończeniu go opróżnia,
  // a te same bajty służą jeszcze do otwarcia dokumentu w czytniku systemowym.
  // Stąd kopia — inaczej drugie użycie dostawało pustą tablicę.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;

  try {
    const pages: RasterPage[] = [];

    for (let number = 1; number <= Math.min(doc.numPages, MAX_PAGES); number += 1) {
      const page = await doc.getPage(number);
      const viewport = page.getViewport({ scale: SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext('2d');
      if (!context) throw new Error('Przeglądarka nie udostępniła kontekstu 2D.');

      // Białe tło pod stroną: PDF nie niesie własnego, a canvas startuje
      // przezroczysty — bez tego dokument na ciemnym motywie byłby nieczytelny.
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      page.cleanup();

      pages.push({
        dataUrl: canvas.toDataURL('image/png'),
        width: viewport.width,
        height: viewport.height,
      });
    }

    return pages;
  } finally {
    // Zamykamy przez zadanie ładowania, a nie przez dokument: to ono trzyma
    // wątek roboczy. Bez tego każdy przerysowany podgląd zostawiałby workera.
    await task.destroy();
  }
}

/**
 * Wczytanie `pdfjs-dist` razem z jego wątkiem roboczym.
 *
 * Adres workera budujemy przez `new URL(..., import.meta.url)`, żeby Vite
 * wciągnął plik do bundla jako zasób z TEGO SAMEGO źródła. Adres z CDN-u albo
 * `blob:` odbiłby się od `default-src 'self'` w polityce CSP aplikacji
 * (`src-tauri/tauri.conf.json`).
 */
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    log.debug('Worker pdf.js podpięty', { src: pdfjs.GlobalWorkerOptions.workerSrc });
  }

  return pdfjs;
}
