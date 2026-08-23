/// <reference lib="webworker" />
import { pdf } from '@react-pdf/renderer';
import { QuotePdfDocument } from './QuotePdfDocument';
import { registerPdfFonts } from './fonts/register';
import type { PdfRenderPayload, PdfWorkerResponse } from './render-payload';

/**
 * Render PDF poza głównym wątkiem (04-PDF §4).
 *
 * Dziesięciostronicowa oferta liczy się na tyle długo, że na głównym wątku
 * zawiesza okno — a od podglądu brandingu na żywo dzieje się to przy każdej
 * zmianie koloru. Tutaj interfejs zostaje płynny.
 *
 * **Ten plik ma prawo się nie uruchomić.** `@react-pdf` nie deklaruje wsparcia
 * dla Web Workerów i może sięgnąć po `window` albo `document`, których tu nie
 * ma. Dlatego strona wywołująca (`renderQuotePdf`) traktuje workera jako
 * przyspieszenie, a nie warunek działania: przy każdym błędzie wraca na główny
 * wątek. Lepiej wolno niż wcale.
 */
self.onmessage = (event: MessageEvent<PdfRenderPayload>) => {
  void (async () => {
    try {
      registerPdfFonts();

      const blob = await pdf(<QuotePdfDocument {...event.data} />).toBlob();
      const bytes = await blob.arrayBuffer();

      const response: PdfWorkerResponse = { ok: true, bytes };
      // Transfer, nie kopia — plik potrafi mieć kilka megabajtów.
      (self as DedicatedWorkerGlobalScope).postMessage(response, [bytes]);
    } catch (error) {
      const response: PdfWorkerResponse = {
        ok: false,
        error: error instanceof Error ? error.message : 'Nieznany błąd renderowania.',
      };
      (self as DedicatedWorkerGlobalScope).postMessage(response);
    }
  })();
};
