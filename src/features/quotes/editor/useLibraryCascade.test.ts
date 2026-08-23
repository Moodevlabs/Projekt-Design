import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLibraryCascade } from './useLibraryCascade';
import { useEditorStore } from './editor.store';
import { newGroup, newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { Quote } from '@/data/repos/quotes.repo';

const LIB_ID = 'lib-1';

function makeQuote(): Quote {
  const body = newQuoteBody({
    sections: [
      newSection({
        title: 'Sekcja',
        items: [newItem({ name: 'Z biblioteki', libraryItemId: LIB_ID, unitPriceCents: 100 })],
        groups: [newGroup({ name: 'Grupa', items: [newItem({ name: 'Własna' })] })],
      }),
    ],
  });

  return {
    id: 'q1',
    workspaceId: 'ws',
    number: null,
    title: 'Wycena',
    status: 'draft',
    totalNetCents: 0,
    totalGrossCents: 0,
    currency: 'PLN',
    clientName: null,
    validUntil: null,
    sentAt: null,
    acceptedAt: null,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    clientId: null,
    body,
    bodyError: null,
    schedule: null,
  };
}

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe('useLibraryCascade', () => {
  it('bez otwartej wyceny nie ma czego kaskadować', () => {
    const { result } = renderHook(() => useLibraryCascade());
    expect(result.current.linkedCount(LIB_ID)).toBe(0);
  });

  it('widzi wycenę wczytaną PO zamontowaniu hooka', () => {
    const { result } = renderHook(() => useLibraryCascade());
    // Hook czyta stan dopiero przy wywołaniu — gdyby subskrybował `body`,
    // strona biblioteki przerysowywałaby się przy każdej zmianie w edytorze.
    useEditorStore.getState().load(makeQuote());
    expect(result.current.linkedCount(LIB_ID)).toBe(1);
  });

  it('przepisuje zmianę na powiązaną pozycję', () => {
    useEditorStore.getState().load(makeQuote());
    const { result } = renderHook(() => useLibraryCascade());

    result.current.apply(LIB_ID, { unitPriceCents: 55_500 });

    expect(useEditorStore.getState().body?.sections[0]?.items[0]?.unitPriceCents).toBe(55_500);
    expect(useEditorStore.getState().saveState).toBe('dirty');
  });
});
