import { describe, expect, it } from 'vitest';

import { BriefProposalSchema, CommentChangesSchema, LibraryImportProposalSchema } from './schema';

/**
 * Schematy odpowiedzi modelu są TOLERANCYJNE: format wyjścia w Deno nie zna
 * ograniczeń długości ani zakresu, więc drobne odchylenie w jednym wierszu
 * nie może unieważnić całej odpowiedzi (i zużytego wywołania z puli).
 */
describe('LibraryImportProposalSchema', () => {
  const row = {
    name: 'Koncepcja',
    description: '',
    categoryName: null,
    pricingChoice: 'flat_lump',
    unitLabel: null,
    unitPriceCents: 250000,
    minPriceCents: null,
    confidence: 'high',
    sourceNote: '',
  };

  it('przycina za długą nazwę i normalizuje kwoty zamiast odrzucać odpowiedź', () => {
    const parsed = LibraryImportProposalSchema.parse({
      items: [
        { ...row, name: `  ${'x'.repeat(170)}  ` },
        { ...row, unitPriceCents: -1, minPriceCents: 199.6 },
      ],
      newCategories: [],
      warnings: [],
    });

    expect(parsed.items[0]!.name).toHaveLength(160);
    expect(parsed.items[1]).toMatchObject({ unitPriceCents: null, minPriceCents: 200 });
  });

  it('wiersz bez nazwy wypada, reszta zostaje', () => {
    const parsed = LibraryImportProposalSchema.parse({
      items: [{ ...row, name: '   ' }, row, { ...row, pricingChoice: 'nie-ma-takiego' }],
      newCategories: [],
      warnings: [],
    });

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.name).toBe('Koncepcja');
  });
});

describe('BriefProposalSchema', () => {
  it('pomieszczenie bez etykiety wypada, ilość zero staje się jedynką', () => {
    const parsed = BriefProposalSchema.parse({
      title: 'T',
      projectDescription: '',
      templateId: null,
      rooms: [
        { roomTypeId: null, label: '', qty: 1 },
        { roomTypeId: null, label: 'salon', qty: 0 },
        { roomTypeId: null, label: 'łazienka', qty: 2.4 },
      ],
      items: [
        { libraryItemId: '', enabled: true, reason: '' },
        { libraryItemId: 'a', enabled: false, reason: '' },
      ],
      openQuestions: [],
    });

    expect(parsed.rooms).toEqual([
      { roomTypeId: null, label: 'salon', qty: 1 },
      { roomTypeId: null, label: 'łazienka', qty: 2 },
    ]);
    expect(parsed.items).toEqual([{ libraryItemId: 'a', enabled: false, reason: '' }]);
  });
});

describe('CommentChangesSchema', () => {
  it('nieznany rodzaj zmiany wypada; ilość zero przechodzi do domeny (tam dostaje powód)', () => {
    const parsed = CommentChangesSchema.parse({
      summary: '',
      changes: [
        { kind: 'teleport', itemId: 'x', reason: '' },
        { kind: 'qty', itemId: 'x', qty: 0, reason: '' },
        { kind: 'disable', itemId: 'y', reason: '' },
      ],
      unresolved: [],
    });

    expect(parsed.changes.map((change) => change.kind)).toEqual(['qty', 'disable']);
  });
});
