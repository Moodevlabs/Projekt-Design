import { describe, expect, it } from 'vitest';

import { applyLibraryImport, isExistingName } from './apply-library-import';
import { LibraryImportProposalSchema, type LibraryImportItem } from './schema';

function item(overrides: Partial<LibraryImportItem> & { name: string }): LibraryImportItem {
  return {
    description: '',
    categoryName: null,
    pricingChoice: 'flat_lump',
    unitLabel: null,
    unitPriceCents: null,
    minPriceCents: null,
    confidence: 'high',
    sourceNote: '',
    ...overrides,
  };
}

const EXISTING = { categoryNames: ['Projekt', 'Nadzór'], itemNames: ['Projekt koncepcyjny'] };

describe('isExistingName', () => {
  it('porównuje bez wielkości liter i spacji na brzegach', () => {
    expect(isExistingName('  projekt KONCEPCYJNY ', EXISTING.itemNames)).toBe(true);
    expect(isExistingName('Projekt wykonawczy', EXISTING.itemNames)).toBe(false);
  });

  it('pusta nazwa nigdy nie jest duplikatem', () => {
    expect(isExistingName('   ', ['   '])).toBe(false);
  });
});

describe('applyLibraryImport', () => {
  it('mapuje sposób wyceny na jednostkę i regułę przez te same funkcje co karta usługi', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [
        item({ name: 'Projekt m2', pricingChoice: 'flat_m2', unitPriceCents: 15000 }),
        item({ name: 'Za pomieszczenie', pricingChoice: 'per_room', unitPriceCents: 80000 }),
        item({ name: 'Wizualizacja', pricingChoice: 'per_frame', unitPriceCents: 40000 }),
        item({
          name: 'Rysunek',
          pricingChoice: 'flat_custom',
          unitLabel: 'rysunek',
          unitPriceCents: 25000,
        }),
      ],
    });

    const result = applyLibraryImport(proposal, [0, 1, 2, 3], EXISTING);

    expect(result.items.map((row) => [row.unit, row.unitLabel, row.pricing.mode])).toEqual([
      ['m2', null, 'flat'],
      ['lump', null, 'per_room'],
      ['frame', null, 'per_frame'],
      ['custom', 'rysunek', 'flat'],
    ]);
    expect(result.items[1]?.pricing).toMatchObject({ mode: 'per_room', roomScope: 'all' });
    expect(result.items[0]?.unitPriceCents).toBe(15000);
    expect(result.duplicates).toEqual([]);
  });

  it('„indywidualnie" zeruje cenę jednostkową, choćby model ją podał', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [item({ name: 'Konsultacja', pricingChoice: 'individual', unitPriceCents: 9900 })],
    });

    const result = applyLibraryImport(proposal, [0], EXISTING);

    expect(result.items[0]).toMatchObject({
      unitPriceCents: null,
      unit: 'lump',
      pricing: { mode: 'flat' },
    });
  });

  it('„indywidualnie" z własną etykietą zachowuje jednostkę custom', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [item({ name: 'Nadzór', pricingChoice: 'individual', unitLabel: 'wizyta' })],
    });

    const result = applyLibraryImport(proposal, [0], EXISTING);
    expect(result.items[0]).toMatchObject({ unit: 'custom', unitLabel: 'wizyta' });
  });

  it('pomija pozycje spoza zaznaczenia bez zgłaszania ich jako duplikaty', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [item({ name: 'A' }), item({ name: 'B' }), item({ name: 'C' })],
    });

    const result = applyLibraryImport(proposal, new Set([2]), EXISTING);

    expect(result.items.map((row) => row.name)).toEqual(['C']);
    // `index` wskazuje pozycję w propozycji, nie w wyniku — zapis po nim odhacza wiersze.
    expect(result.items.map((row) => row.index)).toEqual([2]);
    expect(result.duplicates).toEqual([]);
  });

  it('nazwę, którą biblioteka już ma, zgłasza w duplicates i pomija', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [item({ name: ' projekt koncepcyjny ' }), item({ name: 'Nowa usługa' })],
    });

    const result = applyLibraryImport(proposal, [1], EXISTING);

    expect(result.items.map((row) => row.name)).toEqual(['Nowa usługa']);
    expect(result.duplicates).toEqual(['projekt koncepcyjny']);
  });

  it('jawnie zaznaczony duplikat wchodzi mimo wszystko', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [item({ name: 'Projekt koncepcyjny', unitPriceCents: 100 })],
    });

    const result = applyLibraryImport(proposal, [0], EXISTING);

    expect(result.items).toHaveLength(1);
    expect(result.duplicates).toEqual([]);
  });

  it('powtórzenie nazwy w samej propozycji zostawia pierwsze wystąpienie', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [
        item({ name: 'Wizja lokalna', unitPriceCents: 100 }),
        item({ name: 'WIZJA LOKALNA', unitPriceCents: 200 }),
      ],
    });

    const result = applyLibraryImport(proposal, [0, 1], EXISTING);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.unitPriceCents).toBe(100);
    expect(result.duplicates).toEqual(['WIZJA LOKALNA']);
  });

  it('grupy: istniejącą dopasowuje do dokładnej nazwy, nową zgłasza raz', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [
        item({ name: 'A', categoryName: '  projekt ' }),
        item({ name: 'B', categoryName: 'Wizualizacje' }),
        item({ name: 'C', categoryName: 'wizualizacje' }),
        item({ name: 'D', categoryName: '   ' }),
        item({ name: 'E', categoryName: 'Odrzucona' }),
      ],
    });

    const result = applyLibraryImport(proposal, [0, 1, 2, 3], EXISTING);

    expect(result.items.map((row) => row.categoryName)).toEqual([
      'Projekt',
      'Wizualizacje',
      'wizualizacje',
      null,
    ]);
    // Grupa z pozycji poza zaznaczeniem nie powstaje — nikt by jej nie użył.
    expect(result.categoriesToCreate).toEqual(['Wizualizacje']);
  });

  it('przycina nazwę i opis, przenosi cenę „od" bez zmian', () => {
    const proposal = LibraryImportProposalSchema.parse({
      items: [
        item({
          name: '  Projekt wnętrza  ',
          description: '  pełny zakres  ',
          minPriceCents: 500000,
        }),
        item({ name: '   ' }),
      ],
    });

    const result = applyLibraryImport(proposal, [0, 1], EXISTING);

    expect(result.items).toEqual([
      expect.objectContaining({
        name: 'Projekt wnętrza',
        description: 'pełny zakres',
        minPriceCents: 500000,
      }),
    ]);
  });
});
