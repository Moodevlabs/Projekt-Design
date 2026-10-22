import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateLibraryItemVars } from '@/data/queries/useLibrary';
import { LibraryImportProposalSchema } from '@/domain/ai';
import { pl } from '@/i18n/pl';
import { useAiImport } from './useAiImport';

/**
 * Zapis przerwany w połowie serii nie może przy ponowieniu wstawić drugi raz
 * tego, co już weszło — ani usług, ani grup utworzonych w pierwszej próbie.
 */

const createItem = vi.fn<(vars: CreateLibraryItemVars) => Promise<{ id: string }>>();
const createCategory = vi.fn<(vars: { name: string }) => Promise<{ id: string; name: string }>>();
const toastSuccess = vi.fn<(message: string) => void>();
const toastMessage = vi.fn<(message: string) => void>();

const PROPOSAL = LibraryImportProposalSchema.parse({
  items: [
    { name: 'Projekt A', categoryName: 'Nowa', pricingChoice: 'flat_lump', unitPriceCents: 100 },
    { name: 'Projekt B', categoryName: 'Nowa', pricingChoice: 'flat_lump', unitPriceCents: 200 },
    { name: 'Projekt C', pricingChoice: 'individual' },
  ],
  newCategories: ['Nowa'],
});

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    message: (message: string) => toastMessage(message),
  },
}));

vi.mock('@/data/queries/useAi', () => ({
  useAiImportLibrary: () => ({
    mutate: (_vars: unknown, options: { onSuccess: (result: { data: unknown }) => void }) =>
      options.onSuccess({ data: PROPOSAL }),
    reset: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('@/data/queries/useLibrary', () => ({
  useAllLibraryItems: () => ({ data: [] }),
  useCreateLibraryItem: () => ({ mutateAsync: createItem }),
}));

vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList: () => ({ data: [] }),
  useCreateLibraryCategory: () => ({ mutateAsync: createCategory }),
}));

describe('useAiImport — zapis przerwany w połowie', () => {
  beforeEach(() => {
    createItem.mockReset();
    createCategory.mockReset();
    toastSuccess.mockReset();
    toastMessage.mockReset();
    createCategory.mockResolvedValue({ id: 'cat-nowa', name: 'Nowa' });
  });

  it('po błędzie odznacza zapisane wiersze, a ponowny zapis nie dubluje usług ani grup', async () => {
    createItem
      .mockResolvedValueOnce({ id: 'item-a' })
      .mockRejectedValueOnce(new Error('Sieć padła'))
      .mockResolvedValue({ id: 'item-x' });

    const { result } = renderHook(() => useAiImport());

    act(() => {
      result.current.submitSource({ kind: 'text', text: 'cennik' });
    });
    expect(result.current.step).toBe('proposal');
    expect(result.current.rows.map((row) => row.selected)).toEqual([true, true, true]);

    // Pierwsza próba: grupa + „Projekt A" wchodzą, „Projekt B" pada.
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(false);
    expect(createCategory).toHaveBeenCalledTimes(1);
    expect(createItem).toHaveBeenCalledTimes(2);
    expect(result.current.step).toBe('proposal');
    expect(result.current.saveError).toBe('Sieć padła');
    expect(toastSuccess).toHaveBeenCalledWith(pl.ai.import.done(1));

    // Zapisany wiersz wraca odznaczony i jako „już masz"; reszta zostaje zaznaczona.
    expect(result.current.rows.map((row) => [row.selected, row.alreadyHave])).toEqual([
      [false, true],
      [true, false],
      [true, false],
    ]);
    expect(result.current.selectedCount).toBe(2);

    // Druga próba: bez tworzenia grupy, z `id` grupy z pierwszej próby, tylko B i C.
    await act(async () => {
      ok = await result.current.save();
    });
    expect(ok).toBe(true);
    expect(createCategory).toHaveBeenCalledTimes(1);
    expect(createItem).toHaveBeenCalledTimes(4);
    expect(createItem.mock.calls.slice(2).map(([vars]) => [vars.name, vars.categoryId])).toEqual([
      ['Projekt B', 'cat-nowa'],
      ['Projekt C', null],
    ]);
    expect(result.current.saveError).toBeNull();
    // Odznaczony, zapisany wcześniej wiersz nie jest „pominiętym duplikatem".
    expect(toastMessage).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenLastCalledWith(pl.ai.import.done(2));
  });

  it('nowa analiza zapomina o poprzedniej próbie', async () => {
    createItem.mockRejectedValueOnce(new Error('błąd')).mockResolvedValue({ id: 'item' });
    const { result } = renderHook(() => useAiImport());

    act(() => {
      result.current.submitSource({ kind: 'text', text: 'cennik' });
    });
    await act(async () => {
      await result.current.save();
    });
    expect(createCategory).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.back();
      result.current.submitSource({ kind: 'text', text: 'cennik v2' });
    });
    expect(result.current.rows.every((row) => row.selected)).toBe(true);

    await act(async () => {
      await result.current.save();
    });
    // Świeża propozycja: grupa tworzona od nowa, wszystkie trzy wiersze zapisane.
    expect(createCategory).toHaveBeenCalledTimes(2);
    expect(createItem).toHaveBeenCalledTimes(1 + 3);
  });
});
