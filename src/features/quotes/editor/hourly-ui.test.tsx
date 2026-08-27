import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastInfo = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useLibraryGroups,
  useAllLibraryItems: useLibraryItems,
}));
vi.mock('sonner', () => ({
  toast: { error: toastError, info: toastInfo, success: vi.fn() },
}));

const { LibraryPicker } = await import('./components/LibraryPicker');
const { useEditorStore } = await import('./editor.store');
const { usePricingBasisChange } = await import('./usePricingBasisChange');

function libItem(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'lib-1',
    workspaceId: 'ws',
    categoryName: 'Projekt',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    name: 'Projekt koncepcyjny',
    description: '',
    unitPriceCents: 45,
    sortOrder: 0,
    variantOf: null,
    pricingBasis: 'time',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

/** 120 zł/h → 45 minut = 90 zł. */
const RATE = 12_000;

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  useLibraryGroups.mockReturnValue({ data: [] });
  useLibraryItems.mockReturnValue({ data: [libItem()] });
});

describe('wstawianie z biblioteki między trybami', () => {
  async function wstaw(pricing: { pricingBasis: 'amount' | 'time'; hourlyRateCents: number | null }) {
    const onPickItem = vi.fn();
    const user = userEvent.setup();
    render(<LibraryPicker onPickItem={onPickItem} pricing={pricing} />);

    await user.click(screen.getByRole('button', { name: pl.editor.fromLibrary }));
    await user.click(await screen.findByText('Projekt koncepcyjny'));
    return onPickItem;
  }

  it('PRZELICZA wpis godzinowy wstawiany do wyceny kwotowej', async () => {
    /*
     * Sedno pułapki z T-40: „45" w bibliotece godzinowej to 45 MINUT.
     * Przepisane bez zmian dałoby w ofercie kwotowej 45 groszy — liczba
     * wygląda wiarygodnie, więc nikt by tego nie zauważył.
     */
    const onPickItem = await wstaw({ pricingBasis: 'amount', hourlyRateCents: RATE });

    expect(onPickItem).toHaveBeenCalledTimes(1);
    const wstawiona = onPickItem.mock.calls[0]?.[0] as { unitPriceCents: number };
    expect(wstawiona.unitPriceCents).toBe(9_000);
    expect(toastInfo).toHaveBeenCalledWith(pl.editor.libraryConvertedToAmount);
  });

  it('ODMAWIA, gdy nie ma stawki — bez kursu wymiany nie ma przeliczenia', async () => {
    const onPickItem = await wstaw({ pricingBasis: 'amount', hourlyRateCents: null });

    expect(onPickItem).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(pl.editor.libraryBasisMismatch);
  });

  it('zgodne jednostki wstawia bez przeliczania i bez komunikatu', async () => {
    const onPickItem = await wstaw({ pricingBasis: 'time', hourlyRateCents: RATE });

    const wstawiona = onPickItem.mock.calls[0]?.[0] as { unitPriceCents: number };
    expect(wstawiona.unitPriceCents).toBe(45);
    expect(toastInfo).not.toHaveBeenCalled();
  });
});

describe('usePricingBasisChange', () => {
  function zaladuj(items: number) {
    useEditorStore.setState({
      body: newQuoteBody({
        pricingBasis: 'amount',
        hourlyRateCents: RATE,
        sections: [
          newSection({
            title: 'Sekcja',
            items: Array.from({ length: items }, (_, i) =>
              newItem({ name: `Poz ${i}`, unitPriceCents: 9_000 }),
            ),
          }),
        ],
      }),
      quoteId: 'q1',
      lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
      saveState: 'idle',
    });
  }

  it('PUSTA wycena przełącza się od razu, bez pytania', () => {
    // Nie ma liczb, które mogłyby zmienić znaczenie — dialog byłby przeszkodą.
    zaladuj(0);
    const { result } = renderHook(() => usePricingBasisChange());

    act(() => result.current.request('time'));

    expect(result.current.pending).toBeNull();
    expect(useEditorStore.getState().body?.pricingBasis).toBe('time');
  });

  it('wycena z pozycjami PYTA, zanim cokolwiek zmieni', () => {
    zaladuj(2);
    const { result } = renderHook(() => usePricingBasisChange());

    act(() => result.current.request('time'));

    expect(result.current.pending).toBe('time');
    // Nic się jeszcze nie stało.
    expect(useEditorStore.getState().body?.pricingBasis).toBe('amount');
    expect(useEditorStore.getState().saveState).toBe('idle');
  });

  it('„Przelicz" zmienia liczby według stawki', () => {
    zaladuj(1);
    const { result } = renderHook(() => usePricingBasisChange());

    act(() => result.current.request('time'));
    act(() => result.current.resolve(true));

    const body = useEditorStore.getState().body;
    expect(body?.pricingBasis).toBe('time');
    // 90 zł przy 120 zł/h = 45 minut.
    expect(body?.sections[0]?.items[0]?.unitPriceCents).toBe(45);
  });

  it('„Zostaw liczby" zmienia tylko tryb — liczby zaczynają znaczyć co innego', () => {
    // To jest sensowny przypadek: liczby od początku były minutami, tylko
    // dokument miał zły tryb.
    zaladuj(1);
    const { result } = renderHook(() => usePricingBasisChange());

    act(() => result.current.request('time'));
    act(() => result.current.resolve(false));

    const body = useEditorStore.getState().body;
    expect(body?.pricingBasis).toBe('time');
    expect(body?.sections[0]?.items[0]?.unitPriceCents).toBe(9_000);
  });

  it('anulowanie nie rusza niczego', () => {
    zaladuj(1);
    const { result } = renderHook(() => usePricingBasisChange());

    act(() => result.current.request('time'));
    act(() => result.current.cancel());

    expect(result.current.pending).toBeNull();
    expect(useEditorStore.getState().body?.pricingBasis).toBe('amount');
    expect(useEditorStore.getState().saveState).toBe('idle');
  });

  it('bez stawki nie oferuje przeliczenia i mówi dlaczego', () => {
    zaladuj(1);
    act(() => {
      useEditorStore.setState((state) => ({
        body: state.body ? { ...state.body, hourlyRateCents: null } : null,
      }));
    });

    const { result } = renderHook(() => usePricingBasisChange());
    expect(result.current.canConvert).toBe(false);
    expect(result.current.description).toBe(pl.editor.convertDescriptionNoRate);
  });
});
