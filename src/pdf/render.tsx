import { createLogger } from '@/lib/logger';
import type { PdfRenderPayload, PdfWorkerResponse } from './render-payload';

const log = createLogger('pdf.render');

/** Po ilu ms uznajemy, że worker nie odpowie, i liczymy sami. */
const WORKER_TIMEOUT_MS = 30_000;

/**
 * Czy worker okazał się bezużyteczny.
 *
 * Sprawdzamy **raz na sesję**: skoro `@react-pdf` nie wystartował w workerze
 * przy pierwszym dokumencie, nie wystartuje i przy trzecim, a każda kolejna
 * próba to stracony czas na starcie modułu, po którym i tak liczymy na głównym
 * wątku.
 */
let workerBroken = false;

/**
 * Render oferty do bajtów PDF.
 *
 * **Najpierw worker, potem główny wątek.** Worker jest przyspieszeniem, a nie
 * warunkiem działania — `@react-pdf` nie deklaruje wsparcia dla Web Workerów,
 * więc każdy błąd (brak `window`, timeout, cokolwiek) kończy się cichym
 * powrotem na główny wątek. Eksport oferty nie ma prawa się nie udać dlatego,
 * że optymalizacja nie wypaliła.
 */
export async function renderQuotePdf(payload: PdfRenderPayload): Promise<Uint8Array> {
  if (!workerBroken && typeof Worker !== 'undefined') {
    try {
      return await renderInWorker(payload);
    } catch (error) {
      workerBroken = true;
      log.warn('Render w workerze nieudany — przechodzę na główny wątek', error);
    }
  }

  return renderOnMainThread(payload);
}

function renderInWorker(payload: PdfRenderPayload): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./render.worker.tsx', import.meta.url), {
      type: 'module',
    });

    const finish = (action: () => void) => {
      clearTimeout(timer);
      worker.terminate();
      action();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error('Worker nie odpowiedział na czas.')));
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const data = event.data;
      if (data.ok) finish(() => resolve(new Uint8Array(data.bytes)));
      else finish(() => reject(new Error(data.error)));
    };

    // `onerror` łapie też wywrotkę przy ładowaniu modułu — czyli dokładnie ten
    // przypadek, w którym `@react-pdf` nie działa poza głównym wątkiem.
    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || 'Worker nie wystartował.')));
    };

    worker.postMessage(payload);
  });
}

async function renderOnMainThread(payload: PdfRenderPayload): Promise<Uint8Array> {
  const [{ pdf }, { QuotePdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./QuotePdfDocument'),
  ]);

  const blob = await pdf(<QuotePdfDocument {...payload} />).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

/** Tylko dla testów: przywraca stan „worker jeszcze nie zawiódł". */
export function resetWorkerState() {
  workerBroken = false;
}
