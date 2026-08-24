import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom nie implementuje tych API, a używają ich sonner / Radix.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

/*
 * Pointer capture — jsdom go nie ma, a Radix woła go przy otwieraniu `Select`.
 * Bez tego test, który klika w listę wyboru, wywala się na
 * `target.hasPointerCapture is not a function`, i to w sposób mylący: błąd
 * mówi o wskaźniku, a wygląda jak „nie znaleziono opcji".
 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

/*
 * `Blob.arrayBuffer()` — jsdom go nie implementuje, a wysylka plikow (T-55)
 * czyta nim bajty z obiektu `File`. Bez tego test uploadu wywala sie na
 * `file.arrayBuffer is not a function`, chociaz w przegladarce i w webview
 * Tauri metoda istnieje od lat.
 */
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Nie udalo sie odczytac pliku'));
      reader.readAsArrayBuffer(this);
    });
  };
}
