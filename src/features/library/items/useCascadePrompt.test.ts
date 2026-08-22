import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCascadePrompt } from './useCascadePrompt';
import { useEditorStore } from '@/features/quotes/editor/editor.store';
import { newGroup, newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { Quote } from '@/data/repos/quotes.repo';

/**
 * Kryterium akceptacji T-10 od końca do końca, na PRAWDZIWYM store edytorze:
 * zmiana ceny w bibliotece → pytanie → aktualizacja powiązanej pozycji.
 */
const LIB_ID = 'lib-1';

function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: LIB_ID,
    workspaceId: 'ws',
    category: 'Kuchnia',
    kind: 'item',
    name: 'Blat kuchenny',
    description: 'Kamienny',
    unitPriceCents: 120_000,
    sortOrder: 0,
    ...overrides,
  };
}

function quoteWithLinkedItem(): Quote {
  const body = newQuoteBody({
    sections: [
      newSection({
        title: 'Sekcja',
        items: [
          newItem({ name: 'Blat kuchenny', libraryItemId: LIB_ID, unitPriceCents: 120_000 }),
          newItem({ name: 'Własna pozycja', unitPriceCents: 50_000 }),
        ],
        groups: [
          newGroup({
            name: 'Grupa',
            items: [newItem({ name: 'Blat kuchenny', libraryItemId: LIB_ID, unitPriceCents: 120_000 })],
          }),
        ],
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
  };
}

const prices = () => {
  const body = useEditorStore.getState().body;
  return [
    body?.sections[0]?.items[0]?.unitPriceCents,
    body?.sections[0]?.items[1]?.unitPriceCents,
    body?.sections[0]?.groups[0]?.items[0]?.unitPriceCents,
  ];
};

beforeEach(() => {
  useEditorStore.getState().reset();
});

describe('useCascadePrompt — scenariusz z kryterium T-10', () => {
  it('zmiana ceny w bibliotece pyta o wszystkie powiązane pozycje i je aktualizuje', () => {
    useEditorStore.getState().load(quoteWithLinkedItem());
    const { result } = renderHook(() => useCascadePrompt());

    act(() => result.current.offer(libraryItem(), libraryItem({ unitPriceCents: 99_900 })));

    expect(result.current.prompt).toMatchObject({ itemId: LIB_ID, count: 2 });

    act(() => result.current.accept());

    // Obie powiązane pozycje w nowej cenie, własna nietknięta.
    expect(prices()).toEqual([99_900, 50_000, 99_900]);
    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('odmowa zostawia wycenę nietkniętą', () => {
    useEditorStore.getState().load(quoteWithLinkedItem());
    const { result } = renderHook(() => useCascadePrompt());

    act(() => result.current.offer(libraryItem(), libraryItem({ unitPriceCents: 99_900 })));
    act(() => result.current.dismiss());

    expect(prices()).toEqual([120_000, 50_000, 120_000]);
    expect(useEditorStore.getState().saveState).toBe('idle');
  });

  it('bez otwartej wyceny nie pyta — biblioteką da się zarządzać osobno', () => {
    const { result } = renderHook(() => useCascadePrompt());

    act(() => result.current.offer(libraryItem(), libraryItem({ unitPriceCents: 99_900 })));

    expect(result.current.prompt).toBeNull();
  });

  it('zmiana pola, które NIE kaskaduje, nie zawraca głowy pytaniem', () => {
    useEditorStore.getState().load(quoteWithLinkedItem());
    const { result } = renderHook(() => useCascadePrompt());

    // Kategoria jest cechą biblioteki, nie pozycji w wycenie.
    act(() => result.current.offer(libraryItem(), libraryItem({ category: 'Nadzór' })));

    expect(result.current.prompt).toBeNull();
  });

  it('kaskaduje wyłącznie zmienione pola', () => {
    useEditorStore.getState().load(quoteWithLinkedItem());
    const { result } = renderHook(() => useCascadePrompt());

    act(() => result.current.offer(libraryItem(), libraryItem({ name: 'Blat granitowy' })));
    act(() => result.current.accept());

    const item = useEditorStore.getState().body?.sections[0]?.items[0];
    expect(item?.name).toBe('Blat granitowy');
    // Cena się nie zmieniła w bibliotece, więc nie ma prawa zmienić się w wycenie.
    expect(item?.unitPriceCents).toBe(120_000);
  });
});
