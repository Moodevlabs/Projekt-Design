import { describe, expect, it } from 'vitest';
import {
  DocLibraryCategorySchema,
  docCategoryLabel,
  parseDocLibrarySetItems,
} from './doc-groups';

describe('DocLibraryCategorySchema', () => {
  it('kod i kolor są opcjonalne — nie każde studio numeruje etapy', () => {
    const parsed = DocLibraryCategorySchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      kind: 'schedule',
      name: 'Koncepcja',
    });

    expect(parsed.code).toBe('');
    expect(parsed.color).toBeNull();
    expect(parsed.sortOrder).toBe(0);
  });

  it('odrzuca kolor spoza palety — grupa ma być czytelna na karcie', () => {
    const result = DocLibraryCategorySchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      kind: 'schedule',
      name: 'Koncepcja',
      color: '#ff00ff',
    });

    expect(result.success).toBe(false);
  });

  it('odrzuca nieznany rodzaj dokumentu', () => {
    const result = DocLibraryCategorySchema.safeParse({
      id: '11111111-1111-4111-8111-111111111111',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      kind: 'wycena',
      name: 'Koncepcja',
    });

    expect(result.success).toBe(false);
  });
});

describe('docCategoryLabel', () => {
  it('skleja kod z nazwą, a bez kodu daje samą nazwę', () => {
    expect(docCategoryLabel({ code: '01', name: 'Koncepcja' })).toBe('01 · Koncepcja');
    expect(docCategoryLabel({ code: '', name: 'Koncepcja' })).toBe('Koncepcja');
  });
});

/**
 * Sedno: jeden zepsuty element nie ma prawa zabrać całego zestawu. Wpis
 * zapisany nowszą wersją aplikacji albo poprawiony ręcznie w bazie trafia
 * tu jako śmieć — i ma po prostu wypaść.
 */
describe('parseDocLibrarySetItems', () => {
  it('pomija uszkodzony element, zamiast wywalać cały zestaw', () => {
    const items = parseDocLibrarySetItems('stages', [
      { name: 'Koncepcja' },
      { name: 42 },
      { name: 'Projekt wykonawczy' },
    ]);

    expect(items.map((item) => item.name)).toEqual(['Koncepcja', 'Projekt wykonawczy']);
  });

  it('nie-tablica daje pustą listę, nie wyjątek', () => {
    expect(parseDocLibrarySetItems('stages', null)).toEqual([]);
    expect(parseDocLibrarySetItems('stages', { name: 'Koncepcja' })).toEqual([]);
    expect(parseDocLibrarySetItems('stages', 'Koncepcja')).toEqual([]);
  });

  it('czyta etap terminu razem z jego polami', () => {
    const items = parseDocLibrarySetItems('schedule', [{ name: 'Pomiar', owner: 'provider' }]);

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('Pomiar');
  });
});
