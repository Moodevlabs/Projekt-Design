import { getLogoUrl } from '@/data/repos/brand.repo';
import { createLogger } from '@/lib/logger';

const log = createLogger('pdf.logo');

/**
 * Logo z prywatnego bucketa jako data URL.
 *
 * Data URL, nie link: podpisany adres wygasa, a wygenerowany plik ma być
 * samodzielny. `@react-pdf` w webview i tak nie pobierze podpisanego URL-a sam.
 *
 * **Brak logo nigdy nie jest błędem krytycznym** — dokument wydrukuje się
 * z samą nazwą firmy w nagłówku. Blokowanie eksportu z powodu obrazka byłoby
 * gorsze niż oferta bez logotypu.
 */
export async function fetchLogoAsDataUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  try {
    const url = await getLogoUrl(path);
    if (!url) return null;

    const response = await fetch(url);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
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
  } catch (error) {
    log.warn('Nie udało się wczytać logo do PDF', error);
    return null;
  }
}
