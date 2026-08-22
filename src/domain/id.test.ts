import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('zwraca UUID v4', () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it('generuje unikalne identyfikatory', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    expect(ids.size).toBe(200);
  });

  it('używa awaryjnego generatora, gdy brak crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {});
    expect(newId()).toMatch(UUID_V4);
  });

  it('używa awaryjnego generatora, gdy brak obiektu crypto', () => {
    vi.stubGlobal('crypto', undefined);
    const ids = new Set(Array.from({ length: 50 }, () => newId()));
    expect(ids.size).toBe(50);
    for (const id of ids) {
      expect(id).toMatch(UUID_V4);
    }
  });
});
