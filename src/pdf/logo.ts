import { toast } from 'sonner';
import { getLogoUrl } from '@/data/repos/brand.repo';
import { createLogger } from '@/lib/logger';
import { withTimeout } from '@/lib/with-timeout';
import { pl } from '@/i18n/pl';

const log = createLogger('pdf.logo');

/**
 * Formaty, które `@react-pdf` umie osadzić w PDF-ie **bez konwersji**.
 *
 * Wgrywanie logo dopuszcza też SVG i WebP (`LogoField.TYPES`), a generator
 * takiego obrazka NIE rysuje — i nie zgłasza błędu, tylko cicho pomija
 * `<Image>`. Tak wyglądało „logo w ogóle się nie wyświetla" (2026-09-07):
 * znak studia jest wektorowy, więc każda oferta wychodziła bez niego.
 */
/**
 * Ile czekamy na podpisanie URL-a i pobranie pliku. Logo to kilkadziesiąt
 * kilobajtów; jeśli po 10 s go nie ma, to nie ma go wcale — a oferta bez
 * logotypu jest lepsza niż eksport, który nigdy się nie kończy.
 */
const LOGO_TIMEOUT_MS = 10_000;

const NATIVE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);

/** Czy obrazek trzeba najpierw zamienić na PNG, żeby trafił do PDF-u. */
export function needsRasterizing(mimeType: string): boolean {
  return !NATIVE_TYPES.has(mimeType.toLowerCase().split(';')[0]?.trim() ?? '');
}

/**
 * Szerokość rastra w pikselach. Na nagłówku logo ma najwyżej 150 pt; 900 px
 * daje ~6× tyle, czyli ostro także w druku, a plik zostaje mały.
 */
const RASTER_WIDTH = 900;

/**
 * Zamienia SVG / WebP (i cokolwiek innego, co umie przeglądarka) na PNG
 * przez `<canvas>`. Działa tylko w webview / przeglądarce — dlatego dzieje
 * się tu, na głównym wątku, a nie w workerze renderującym PDF.
 *
 * SVG bez `width`/`height` w pliku ma w `<img>` rozmiar 0×0 lub 300×150;
 * skalujemy po proporcjach do `RASTER_WIDTH`, żeby nie rysować rozmytej
 * miniatury.
 */
async function rasterizeToPng(blob: Blob): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Nie udało się zdekodować logo.'));
      element.src = objectUrl;
    });

    const sourceWidth = image.naturalWidth || 300;
    const sourceHeight = image.naturalHeight || 150;
    const scale = RASTER_WIDTH / sourceWidth;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Brak kontekstu canvas.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // `readAsDataURL` daje string, ale typ `FileReader` dopuszcza też
      // ArrayBuffer — sprawdzamy jawnie, zamiast rzutować na ślepo.
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Nieoczekiwany format logo.'));
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać logo.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Logo z prywatnego bucketa jako data URL PNG/JPEG — gotowe dla `@react-pdf`.
 *
 * Data URL, nie link: podpisany adres wygasa, a wygenerowany plik ma być
 * samodzielny. `@react-pdf` w webview i tak nie pobierze podpisanego URL-a sam.
 *
 * **Brak logo nigdy nie jest błędem krytycznym** — dokument wydrukuje się
 * z samą nazwą firmy w nagłówku. Blokowanie eksportu z powodu obrazka byłoby
 * gorsze niż oferta bez logotypu. Ale powód braku ma trafić do logu.
 */
export async function fetchLogoAsDataUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  try {
    const url = await withTimeout(
      getLogoUrl(path),
      LOGO_TIMEOUT_MS,
      'Podpisanie URL logo trwało zbyt długo.',
    );
    if (!url) return null;

    const response = await withTimeout(
      fetch(url),
      LOGO_TIMEOUT_MS,
      'Pobranie logo trwało zbyt długo.',
    );
    if (!response.ok) throw new Error(`Pobranie logo: HTTP ${response.status}`);
    const blob = await response.blob();

    // Typ z nagłówka bywa pusty (`application/octet-stream`) — wtedy patrzymy
    // na rozszerzenie ścieżki, zanim uznamy plik za PNG.
    const type = blob.type || typeFromPath(path);

    if (needsRasterizing(type)) {
      log.info('Logo w formacie spoza PDF — rasteryzacja do PNG', { path, type });
      return await rasterizeToPng(blob);
    }

    return await blobToDataUrl(blob);
  } catch (error) {
    log.warn('Nie udało się wczytać logo do PDF', error);
    // Człowiek ma wiedzieć, że oferta wyszła bez znaku — inaczej zauważy to
    // dopiero inwestor.
    toast.warning(pl.pdf.logoSkipped);
    return null;
  }
}

function typeFromPath(path: string): string {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}
