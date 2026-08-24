import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { newGroup, newItem, newQuoteBody } from '@/domain/quote';
import { useEditorStore } from './editor.store';

const saveItemsMutate = vi.hoisted(() => vi.fn());
const createGroupMutate = vi.hoisted(() => vi.fn());
const toastInfo = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useSaveItemsToLibrary: () => ({ mutate: saveItemsMutate }),
  useCreateLibraryGroup: () => ({ mutate: createGroupMutate }),
}));

vi.mock('sonner', () => ({
  toast: { info: toastInfo, error: toastError, success: toastSuccess },
}));

const { useSaveToLibrary } = await import('./useSaveToLibrary');

const SAVED_ID = '55555555-5555-4555-8555-555555555555';

function libraryEntry(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: SAVED_ID,
    workspaceId: 'ws',
    category: 'Inne',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    name: 'Blat kuchenny',
    description: '',
    unitPriceCents: 120_000,
    sortOrder: 0,
    variantOf: null,
    pricingBasis: 'amount',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

/** Odgrywa udany round-trip zapisu pozycji. */
function respondWith(entries: LibraryItem[]) {
  saveItemsMutate.mockImplementation(
    (_items: unknown, options?: { onSuccess?: (saved: LibraryItem[]) => void }) =>
      options?.onSuccess?.(entries),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  respondWith([libraryEntry()]);
});

describe('useSaveToLibrary — pojedyncza pozycja', () => {
  it('wiaze zapisana pozycje wyceny ze swiezym wpisem biblioteki', () => {
    const item = newItem({ name: 'Blat kuchenny', unitPriceCents: 120_000 });
    const section = { id: crypto.randomUUID(), title: 'Prace', groups: [], items: [item] };
    useEditorStore.setState({ body: { ...newQuoteBody(), sections: [section] } });

    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveItem(item);

    // Bez tego kaskada z biblioteki omijalaby pozycje, z ktorej wpis powstal.
    const saved = useEditorStore.getState().body?.sections[0]?.items[0];
    expect(saved?.libraryItemId).toBe(SAVED_ID);
  });

  it('nieudany zapis nie wiaze pozycji z niczym', () => {
    const item = newItem({ name: 'Blat kuchenny', unitPriceCents: 120_000 });
    const section = { id: crypto.randomUUID(), title: 'Prace', groups: [], items: [item] };
    useEditorStore.setState({ body: { ...newQuoteBody(), sections: [section] } });
    respondWith([]);

    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveItem(item);

    expect(useEditorStore.getState().body?.sections[0]?.items[0]?.libraryItemId).toBeNull();
  });
});

describe('useSaveToLibrary — zestaw', () => {
  it('zapisuje grupe jako zestaw ze snapshotami i ilosciami', () => {
    const group = newGroup({
      name: 'Kuchnia',
      items: [
        newItem({ name: 'Projekt', unitPriceCents: 9_000, qty: 14 }),
        newItem({ name: 'Wizualizacje', unitPriceCents: 45_000, qty: 3 }),
      ],
    });

    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveGroup(group);

    const vars = createGroupMutate.mock.calls[0]?.[0] as {
      name: string;
      items: { name: string; qty: number }[];
    };
    expect(vars.name).toBe('Kuchnia');
    expect(vars.items).toHaveLength(2);
    // Ilosc jest czescia zestawu — 14 m2 projektu, nie jedna sztuka.
    expect(vars.items[0]).toMatchObject({ name: 'Projekt', qty: 14 });
  });

  it('pomija pozycje bez nazwy — snapshot ich nie przyjmie', () => {
    const group = newGroup({
      name: 'Kuchnia',
      items: [newItem({ name: 'Projekt', unitPriceCents: 9_000 }), newItem({ name: '  ' })],
    });

    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveGroup(group);

    const vars = createGroupMutate.mock.calls[0]?.[0] as { items: unknown[] };
    expect(vars.items).toHaveLength(1);
  });

  it('nie zapisuje zestawu bez nazwy', () => {
    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveGroup(newGroup({ name: '   ', items: [newItem({ name: 'Projekt' })] }));

    expect(createGroupMutate).not.toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
  });

  it('nie zapisuje pustego zestawu', () => {
    const { result } = renderHook(() => useSaveToLibrary());
    result.current.saveGroup(newGroup({ name: 'Kuchnia', items: [] }));

    expect(createGroupMutate).not.toHaveBeenCalled();
    expect(toastInfo).toHaveBeenCalled();
  });
});
