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
