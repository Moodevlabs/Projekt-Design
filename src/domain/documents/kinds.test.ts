import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DOCUMENT_NUMBER_PATTERNS,
  DOCUMENT_KINDS,
  defaultTitleForKind,
  documentKindFromLegacy,
  hasQuoteSurface,
  usesRooms,
} from './kinds';

describe('rodzaje dokumentu (T-99)', () => {
  it('ma cztery rodzaje w ustalonej kolejności rejestru', () => {
    expect(DOCUMENT_KINDS).toEqual(['offer', 'schedule', 'stages', 'price_list']);
  });

  it('mapuje stare etykiety rejestru sprzed T-99', () => {
    expect(documentKindFromLegacy('schedule_only')).toBe('schedule');
    expect(documentKindFromLegacy('price_list_only')).toBe('price_list');
    expect(documentKindFromLegacy('stages')).toBe('stages');
  });

  it('nieznana wartość to wycena, nie błąd', () => {
    expect(documentKindFromLegacy(undefined)).toBe('offer');
    expect(documentKindFromLegacy('cokolwiek')).toBe('offer');
  });

  it('wzorce numerów mają prefiks per rodzaj i licznik {seq} — parytet z SQL 0042', () => {
    expect(DEFAULT_DOCUMENT_NUMBER_PATTERNS.schedule).toBe('TER/{YYYY}/{MM}/{seq}');
    expect(DEFAULT_DOCUMENT_NUMBER_PATTERNS.stages).toBe('ETP/{YYYY}/{MM}/{seq}');
    expect(DEFAULT_DOCUMENT_NUMBER_PATTERNS.price_list).toBe('CEN/{YYYY}/{MM}/{seq}');
  });

  it('tylko wycena ma powierzchnię wyceny; pomieszczenia mają wycena i termin', () => {
    expect(DOCUMENT_KINDS.filter(hasQuoteSurface)).toEqual(['offer']);
    expect(DOCUMENT_KINDS.filter(usesRooms)).toEqual(['offer', 'schedule']);
  });

  it('tytuł domyślny jest po polsku i różny dla każdego rodzaju', () => {
    const titles = DOCUMENT_KINDS.map(defaultTitleForKind);
    expect(new Set(titles).size).toBe(4);
    expect(defaultTitleForKind('price_list')).toBe('Cennik dodatkowy');
  });
});
