import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { LibraryCategory } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';

const useLibraryCategoryList = vi.hoisted(() => vi.fn());
const useAllLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryItems = vi.hoisted(() => vi.fn());
const updateItemMutate = vi.hoisted(() => vi.fn());
const updateCategoryMutate = vi.hoisted(() => vi.fn());
const deleteCategoryMutate = vi.hoisted(() => vi.fn());
const reorderMutate = vi.hoisted(() => vi.fn());
const createCategoryMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList,
  useCreateLibraryCategory: () => ({ mutate: createCategoryMutate, isPending: false }),
  useUpdateLibraryCategory: () => ({ mutate: updateCategoryMutate, isPending: false }),
  useDeleteLibraryCategory: () => ({ mutate: deleteCategoryMutate, isPending: false }),
  useReorderLibraryCategories: () => ({ mutate: reorderMutate, isPending: false }),
}));

vi.mock('@/data/queries/useLibrary', () => ({
  useAllLibraryItems,
  useLibraryItems,
  useUpdateLibraryItem: () => ({ mutate: updateItemMutate, isPending: false }),
}));

const { LibraryCategoriesTab } = await import('./LibraryCategoriesTab');

const PRZYGOTOWANIE = '11111111-1111-4111-8111-111111111111';
const PROJEKT = '33333333-3333-4333-8333-333333333333';

function category(partial: Partial<LibraryCategory> = {}): LibraryCategory {
  return {
    id: PRZYGOTOWANIE,
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Przygotowanie',
    code: '01',
    color: null,
    sortOrder: 0,
    isSample: false,
    ...partial,
  };
}

function item(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    categoryName: 'Przygotowanie',
    categoryId: PRZYGOTOWANIE,
    kind: 'item',
    name: 'Inwentaryzacja',
    description: '',
    unitPriceCents: 50_000,
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

function setup(categories: LibraryCategory[], items: LibraryItem[]) {
  useLibraryCategoryList.mockReturnValue({
    data: categories,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  const items_ = { data: items, isLoading: false, isError: false, refetch: vi.fn() };
  useAllLibraryItems.mockReturnValue(items_);
  useLibraryItems.mockReturnValue(items_);
  return render(<LibraryCategoriesTab />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Sedno T-120: grupa jest POJEMNIKIEM, nie etykietą. Do tej pory licznik
 * „1 usługa" był samym tekstem i nie dawało się z tego miejsca ani zobaczyć
 * zawartości grupy, ani niczego do niej dopiąć.
 */
describe('LibraryCategoriesTab — zawartość grupy', () => {
  it('rozwija wskazaną grupę i pokazuje jej usługi', async () => {
    const user = userEvent.setup();
    setup(
      [category(), category({ id: PROJEKT, name: 'Projekt', code: '02', sortOrder: 1 })],
      [item(), item({ id: '55555555-5555-4555-8555-555555555555', name: 'Rzuty', categoryId: PROJEKT, categoryName: 'Projekt' })],
    );

    expect(screen.queryByText('Inwentaryzacja')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.categoryShowItems('Przygotowanie') }),
    );

    expect(screen.getByText('Inwentaryzacja')).toBeInTheDocument();
    // Rozwinięcie JEDNEJ grupy nie wywleka zawartości pozostałych.
    expect(screen.queryByText('Rzuty')).not.toBeInTheDocument();
  });

  it('dopięcie usługi to przestawienie categoryId, nie kopia', async () => {
    const user = userEvent.setup();
    setup(
      [category()],
      [item({ id: '66666666-6666-4666-8666-666666666666', name: 'Rzuty', categoryId: null, categoryName: '' })],
    );

    await user.click(
      screen.getByRole('button', { name: pl.library.categoryShowItems('Przygotowanie') }),
    );
    expect(screen.getByText(pl.library.categoryItemsEmpty)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: pl.library.categoryAddItemFor('Przygotowanie') }),
    );
    // Panel z prawej (T-123): wiersz ma jawny przycisk „Dodaj", a nie jest
    // klikalny w całości jak dawny wiersz popovera.
    await user.click(
      await screen.findByRole('button', { name: pl.library.categoryPickerAddLabel('Rzuty') }),
    );

    expect(updateItemMutate).toHaveBeenCalledWith(
      { id: '66666666-6666-4666-8666-666666666666', patch: { categoryId: PRZYGOTOWANIE } },
      expect.anything(),
    );
  });

  it('odpięcie ustawia categoryId na null, a nie usuwa usługi', async () => {
    const user = userEvent.setup();
    setup([category()], [item()]);

    await user.click(
      screen.getByRole('button', { name: pl.library.categoryShowItems('Przygotowanie') }),
    );
    await user.click(
      screen.getByRole('button', { name: pl.library.categoryRemoveItem('Inwentaryzacja') }),
    );

    expect(updateItemMutate).toHaveBeenCalledWith(
      { id: '44444444-4444-4444-8444-444444444444', patch: { categoryId: null } },
      expect.anything(),
    );
  });

  it('picker proponuje też usługi z innych grup, bo dopięcie je przenosi', async () => {
    const user = userEvent.setup();
    setup(
      [category(), category({ id: PROJEKT, name: 'Projekt', code: '02', sortOrder: 1 })],
      [item(), item({ id: '77777777-7777-4777-8777-777777777777', name: 'Rzuty', categoryId: PROJEKT, categoryName: 'Projekt' })],
    );

    await user.click(
      screen.getByRole('button', { name: pl.library.categoryShowItems('Przygotowanie') }),
    );
    await user.click(
      screen.getByRole('button', { name: pl.library.categoryAddItemFor('Przygotowanie') }),
    );

    expect(await screen.findByText('Rzuty')).toBeInTheDocument();
    expect(screen.getByText(pl.library.categoryPickerFrom('Projekt'))).toBeInTheDocument();
  });
});
