import { describe, expect, it } from 'vitest';
import { needsRasterizing } from './logo';

describe('needsRasterizing — co `@react-pdf` osadzi bez konwersji', () => {
  it('PNG i JPEG idą wprost', () => {
    expect(needsRasterizing('image/png')).toBe(false);
    expect(needsRasterizing('image/jpeg')).toBe(false);
    expect(needsRasterizing('IMAGE/PNG')).toBe(false);
  });

  it('SVG i WebP trzeba zrasteryzować — inaczej logo cicho znika z PDF-u', () => {
    expect(needsRasterizing('image/svg+xml')).toBe(true);
    expect(needsRasterizing('image/webp')).toBe(true);
    expect(needsRasterizing('application/octet-stream')).toBe(true);
    expect(needsRasterizing('')).toBe(true);
  });
});
