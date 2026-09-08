import { describe, expect, it } from 'vitest';
import { latestImage, placeholderKind, projectImages, resolveCover } from './cover';
import type { StoredFile } from '../files/schema';

function file(partial: Partial<StoredFile> & { id: string; name: string }): StoredFile {
  return {
    workspaceId: 'ws',
    clientId: 'c1',
    projectId: 'p1',
    quoteId: null,
    siteVisitId: null,
    kind: 'upload',
    docType: null,
    quoteVersion: null,
    mime: '',
    sizeBytes: 100,
    storagePath: `ws/${partial.id}`,
    createdBy: null,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    deletedAt: null,
    ...partial,
  };
}

const rzut = file({ id: 'f-pdf', name: 'rzut.pdf', mime: 'application/pdf' });
const stary = file({
  id: 'f-old',
  name: 'wizja.jpg',
  mime: 'image/jpeg',
  createdAt: '2026-08-01T10:00:00Z',
});
// Bez MIME (dialog Tauri) — obraz po rozszerzeniu, jak w SQL widoku.
const nowy = file({ id: 'f-new', name: 'wizualizacja.PNG', createdAt: '2026-09-05T10:00:00Z' });
const skasowany = file({
  id: 'f-del',
  name: 'usuniete.png',
  mime: 'image/png',
  createdAt: '2026-09-09T10:00:00Z',
  deletedAt: '2026-09-09T11:00:00Z',
});

describe('placeholderKind', () => {
  it('zna cztery typy, resztę sprowadza do „inny"', () => {
    expect(placeholderKind('house')).toBe('house');
    expect(placeholderKind('apartment')).toBe('apartment');
    expect(placeholderKind('commercial')).toBe('commercial');
    expect(placeholderKind('')).toBe('other');
    expect(placeholderKind('kamienica')).toBe('other');
  });
});

describe('projectImages / latestImage', () => {
  it('bierze tylko obrazy (MIME albo rozszerzenie), pomija skasowane, najnowszy pierwszy', () => {
    expect(projectImages([rzut, stary, nowy, skasowany]).map((f) => f.id)).toEqual([
      'f-new',
      'f-old',
    ]);
    expect(latestImage([rzut, stary, nowy])?.id).toBe('f-new');
    expect(latestImage([rzut])).toBeNull();
  });
});

describe('resolveCover', () => {
  it('wybrany plik ma pierwszeństwo', () => {
    expect(resolveCover('f-old', [stary, nowy])).toEqual({ file: stary, source: 'chosen' });
  });

  it('wybrany, którego już nie ma albo nie jest obrazem, wraca do automatu', () => {
    expect(resolveCover('f-del', [stary, nowy, skasowany]).source).toBe('auto');
    expect(resolveCover('f-pdf', [rzut, nowy]).file?.id).toBe('f-new');
  });

  it('bez obrazów zostaje placeholder', () => {
    expect(resolveCover(null, [rzut])).toEqual({ file: null, source: 'placeholder' });
  });
});
