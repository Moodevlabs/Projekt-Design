import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryCategory, LibraryGroup } from '@/domain/library/schema';
import { AMOUNT_BASIS, type Group, type PricingContext } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useAllLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());
const useLibraryCategoryList = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({ useAllLibraryItems, useLibraryGroups }));
vi.mock('@/data/queries/useLibraryCategories', () => ({ useLibraryCategoryList }));

const { GroupFromLibraryDialog } = await import('./GroupFromLibraryDialog');
const { useGroupPicker } = await import('./group-picker.store');

const PRZYGOTOWANIE = '11111111-1111-4111-8111-111111111111';
const SECTION = '99999999-9999-4999-8999-999999999999';

function category(partial: Partial<LibraryCategory> = {}): LibraryCategory {
  return {
    id: PRZYGOTOWANIE,
    workspaceId: 'ws',
    name: 'Przygotowanie',
    code: '01',
    color: 'sage',
    sortOrder: 0,
    isSample: false,
    ...partial,
  };
}

function item(partial: Partial<LibraryItem> & { id: string; name: string }): LibraryItem {
  return {
    workspaceId: 'ws',
    categoryName: 'Przygotowanie',
    categoryId: PRZYGOTOWANIE,
    kind: 'item',
    description: '',
    unitPriceCents: 10_000,
    unit: 'lump',
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    sortOrder: 0,
    pricing: { mode: 'flat' },
    variantOf: null,
    pricingBasis: 'amount',
    ...partial,
  };
}

function set(partial: Partial<LibraryGroup> = {}): LibraryGroup {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    workspaceId: 'ws',
    name: 'Kuchnia pod klucz',
    items: [
      { name: 'Zabudowa', description: '', kind: 'item', qty: 1, unitPriceCents: 300_000, libraryItemId: null },
    ],
    sortOrder: 0,
    ...partial,
  };
}

function setup({
  categories = [category()],
  items = [item({ id: 'i1', name: 'Inwentaryzacja' }), item({ id: 'i2', name: 'Pomiar' })],
  sets = [set()],
  pricing = AMOUNT_BASIS,
}: {
  categories?: LibraryCategory[];
  items?: LibraryItem[];
  sets?: LibraryGroup[];
  pricing?: PricingContext;
} = {}) {
  useLibraryCategoryList.mockReturnValue({ data: categories });
  useAllLibraryItems.mockReturnValue({ data: items });
  useLibraryGroups.mockReturnValue({ data: sets });

  // Typowany mock, nie goły `vi.fn()` — inaczej `mock.calls[0]` wraca jako
  // `any` i asercje na kształt grupy niczego nie pilnują.
  const onInsertGroup = vi.fn<(sectionId: string, group: Group) => void>();
  render(<GroupFromLibraryDialog pricing={pricing} onInsertGroup={onInsertGroup} />);
  return onInsertGroup;
}

beforeEach(() => {
  vi.clearAllMocks();
  act(() => useGroupPicker.setState({ open: false, sectionId: null, tab: 'categories' }));
});

/**
 * Sedno T-120 po stronie wyceny: „Dodaj grupę" ma prowadzić do biblioteki,
 * a nie tylko do pustej „Nowej grupy".
 */
describe('GroupFromLibraryDialog — grupa ze słownika', () => {
  it('wstawia grupę z jej usługami i zapisuje pochodzenie', async () => {
    const user = userEvent.setup();
    const onInsertGroup = setup();

    act(() => useGroupPicker.getState().openFor(SECTION, 'categories'));

    await user.click(
      await screen.findByRole('button', { name: pl.editor.groupPickerPick('Przygotowanie') }),
    );
    await user.click(screen.getByRole('button', { name: pl.editor.groupPickerInsert }));

    expect(onInsertGroup).toHaveBeenCalledTimes(1);
    const [sectionId, group] = onInsertGroup.mock.calls[0]!;
    expect(sectionId).toBe(SECTION);
    expect(group.name).toBe('Przygotowanie');
    expect(group.categoryId).toBe(PRZYGOTOWANIE);
    expect(group.items.map((row) => row.name)).toEqual(['Inwentaryzacja', 'Pomiar']);
  });

  it('odznaczona usługa nie wchodzi do wyceny', async () => {
    const user = userEvent.setup();
    const onInsertGroup = setup();

    act(() => useGroupPicker.getState().openFor(SECTION, 'categories'));

    await user.click(
      await screen.findByRole('button', { name: pl.editor.groupPickerPick('Przygotowanie') }),
    );
    // Kontrolka jest NASZA (Radix), nie systemowym `<input type=checkbox>` —
    // pilnujemy jej dostępnego kontraktu, bo od niego zależy kliknięcie
    // w etykietę: `button` jest elementem etykietowalnym, `div` już nie.
    const pomiar = screen.getByLabelText('Pomiar');
    expect(pomiar).toHaveAttribute('role', 'checkbox');
    expect(pomiar).toHaveAttribute('aria-checked', 'true');

    // Domyślnie zaznaczone jest wszystko — odznaczanie jest wyjątkiem.
    await user.click(pomiar);
    expect(pomiar).toHaveAttribute('aria-checked', 'false');
    await user.click(screen.getByRole('button', { name: pl.editor.groupPickerInsert }));

    const [, group] = onInsertGroup.mock.calls[0]!;
    expect(group.items.map((row) => row.name)).toEqual(['Inwentaryzacja']);
  });

  it('pusta grupa słownika mówi o tym wprost, zamiast udawać listę', async () => {
    const user = userEvent.setup();
    setup({ items: [] });

    act(() => useGroupPicker.getState().openFor(SECTION, 'categories'));

    await user.click(
      await screen.findByRole('button', { name: pl.editor.groupPickerPick('Przygotowanie') }),
    );
    expect(screen.getByText(pl.editor.groupPickerEmptyCategory)).toBeInTheDocument();
  });

  /**
   * Regresja na najdroższą pomyłkę tej ścieżki: wpis godzinowy wstawiony
   * wprost do wyceny kwotowej byłby 45 groszami tam, gdzie ktoś policzył
   * 45 minut pracy. Bez stawki nie ma kursu wymiany, więc pozycja odpada.
   */
  it('nie wstawia pozycji, której nie da się przeliczyć na tryb wyceny', async () => {
    const user = userEvent.setup();
    const onInsertGroup = setup({
      items: [item({ id: 'i1', name: 'Nadzór', pricingBasis: 'time' })],
      pricing: AMOUNT_BASIS,
    });

    act(() => useGroupPicker.getState().openFor(SECTION, 'categories'));

    await user.click(
      await screen.findByRole('button', { name: pl.editor.groupPickerPick('Przygotowanie') }),
    );
    await user.click(screen.getByRole('button', { name: pl.editor.groupPickerInsert }));

    const [, group] = onInsertGroup.mock.calls[0]!;
    expect(group.items).toEqual([]);
  });
});

describe('GroupFromLibraryDialog — zestaw', () => {
  it('wstawia zestaw jednym kliknięciem, bez pochodzenia ze słownika', async () => {
    const user = userEvent.setup();
    const onInsertGroup = setup();

    act(() => useGroupPicker.getState().openFor(SECTION, 'sets'));

    await user.click(
      await screen.findByRole('button', { name: pl.editor.groupPickerPick('Kuchnia pod klucz') }),
    );

    const [sectionId, group] = onInsertGroup.mock.calls[0]!;
    expect(sectionId).toBe(SECTION);
    expect(group.name).toBe('Kuchnia pod klucz');
    // Zestaw to snapshot, nie wpis słownika — pochodzenia nie ma czego wskazać.
    expect(group.categoryId).toBeNull();
    expect(group.items).toHaveLength(1);
  });
});
