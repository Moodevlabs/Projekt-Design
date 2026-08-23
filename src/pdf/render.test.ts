import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultBrandKit } from '@/domain/brand/schema';
import { newQuoteBody } from '@/domain/quote';
import { buildPdfTheme } from './theme';
import type { PdfRenderPayload } from './render-payload';

const toBlob = vi.hoisted(() => vi.fn());
vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob }),
  Document: () => null,
  Page: () => null,
  View: () => null,
  Text: () => null,
  Image: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));
vi.mock('./QuotePdfDocument', () => ({ QuotePdfDocument: () => null }));

const { renderQuotePdf, resetWorkerState } = await import('./render');

/** Atrapa workera — testy sterują tym, co i kiedy odeśle. */
class FakeWorker {
  static ostatni: FakeWorker | null = null;
  static zachowanie: 'ok' | 'error' | 'blad-ladowania' | 'cisza' = 'ok';

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor() {
    FakeWorker.ostatni = this;
  }

  postMessage() {
    queueMicrotask(() => {
      if (FakeWorker.zachowanie === 'ok') {
        const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer;
        this.onmessage?.({ data: { ok: true, bytes } } as MessageEvent);
      } else if (FakeWorker.zachowanie === 'error') {
        this.onmessage?.({ data: { ok: false, error: 'brak window' } } as MessageEvent);
      } else if (FakeWorker.zachowanie === 'blad-ladowania') {
        this.onerror?.({ message: 'window is not defined' } as ErrorEvent);
      }
      // 'cisza' — worker nie odpowiada w ogóle.
    });
  }

  terminate() {
    this.terminated = true;
  }
}

function payload(): PdfRenderPayload {
  const body = newQuoteBody({ title: 'Wycena' });
  return {
    body,
    theme: buildPdfTheme(defaultBrandKit()),
    brandKit: defaultBrandKit(),
    number: 'WYC/2026/08/0001',
    issueDate: '2026-08-01',
    currency: 'PLN',
    logoDataUrl: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWorkerState();
  FakeWorker.ostatni = null;
  FakeWorker.zachowanie = 'ok';
  vi.stubGlobal('Worker', FakeWorker);
  toBlob.mockResolvedValue({
    arrayBuffer: () => Promise.resolve(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]).buffer),
  });
});

describe('renderQuotePdf', () => {
  it('renderuje w workerze, gdy ten dziala', async () => {
    const bytes = await renderQuotePdf(payload());

    expect(bytes).toBeInstanceOf(Uint8Array);
    // `%PDF` — wynik przyszedl z workera, a nie z atrapy glownego watku.
    expect([...bytes]).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(toBlob).not.toHaveBeenCalled();
  });

  it('sprzata workera po udanym renderze', async () => {
    await renderQuotePdf(payload());
    expect(FakeWorker.ostatni?.terminated).toBe(true);
  });

  it('wraca na glowny watek, gdy worker zglosi blad', async () => {
    // `@react-pdf` nie deklaruje wsparcia dla Web Workerow. Eksport oferty nie
    // ma prawa polec dlatego, ze optymalizacja nie wypalila.
    FakeWorker.zachowanie = 'error';
    const bytes = await renderQuotePdf(payload());

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect([...bytes]).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
  });

  it('wraca na glowny watek, gdy worker w ogole nie wystartuje', async () => {
    FakeWorker.zachowanie = 'blad-ladowania';
    await renderQuotePdf(payload());
    expect(toBlob).toHaveBeenCalledTimes(1);
  });

  it('po pierwszej porazce NIE probuje workera ponownie', async () => {
    // Skoro nie wystartowal przy pierwszym dokumencie, nie wystartuje i przy
    // trzecim — kazda kolejna proba to stracony czas na starcie modulu.
    FakeWorker.zachowanie = 'error';
    await renderQuotePdf(payload());

    FakeWorker.ostatni = null;
    FakeWorker.zachowanie = 'ok';
    await renderQuotePdf(payload());

    expect(FakeWorker.ostatni).toBeNull();
    expect(toBlob).toHaveBeenCalledTimes(2);
  });

  it('liczy na glownym watku, gdy srodowisko nie zna Workera', async () => {
    vi.stubGlobal('Worker', undefined);
    const bytes = await renderQuotePdf(payload());

    expect(toBlob).toHaveBeenCalledTimes(1);
    expect(bytes).toBeInstanceOf(Uint8Array);
  });
});
