import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useAllLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryUsage = vi.hoisted(() =>
  vi.fn(() => ({
    data: [] as { itemId: string; quotesCount: number; lastUsedAt: string | null }[],
    isLoading: false,
  })),
);
const createMutate = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({
  useAllLibraryItems,
  useLibraryUsage,
  useCreateLibraryItem: () => ({ mutate: createMutate, isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList: () => ({
    data: [
      {
        id: 'cat-1',
        workspaceId: 'ws',
        name: 'Projekt',
        code: '01',
        color: null,
        sortOrder: 0,
        isSample: false,
      },
    ],
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const { LibraryItemPage } = await import('./LibraryItemPage');

function item(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'item-1',
    workspaceId: 'ws',
    category: 'Projekt',
    categoryId: 'cat-1',
    kind: 'item',
    name: 'Pomiar wnętrza',
    description: 'Inwentaryzacja z rysunkiem',
    unitPriceCents: 1_200,
    unit: 'm2',
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

function renderPage(rows: LibraryItem[], path = '/biblioteka/uslugi/item-1') {
  useAllLibraryItems.mockReturnValue({ data: rows, isLoading: false });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/biblioteka/uslugi/nowa" element={<LibraryItemPage />} />
        <Route path="/biblioteka/uslugi/:id" element={<LibraryItemPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LibraryItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLibraryUsage.mockReturnValue({ data: [], isLoading: false });
  });

  it('wczytuje usluge do formularza i rozpoznaje sposob wyceny', () => {
    renderPage([item()]);

    expect(screen.getByDisplayValue('Pomiar wnętrza')).toBeInTheDocument();
    // `flat` + `m2` to „Za m²", a nie „Kwota stała".
    expect(screen.getByRole('radio', { name: pl.library.pricingChoices.flat_m2 })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('usluga bez ceny wchodzi jako „Indywidualnie"', () => {
    // Rozpoznajemy po BRAKU CENY, nie po trybie — inaczej strona pokazywalaby
    // „Kwota stała" przy pozycji, ktora zadnej kwoty nie ma.
    renderPage([item({ unitPriceCents: null })]);

    expect(
      screen.getByRole('radio', { name: pl.library.pricingChoices.individual }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('wybor „Indywidualnie" chowa pole ceny i zapisuje `null`', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    await user.click(screen.getByRole('radio', { name: pl.library.pricingChoices.individual }));
    expect(screen.queryByLabelText(pl.library.itemPriceLabel)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.library.saveChanges }));
    expect(updateMutate.mock.calls[0]?.[0]).toMatchObject({
      id: 'item-1',
      patch: { unitPriceCents: null },
    });
  });

  it('zmiana sposobu wyceny ustawia JEDNOSTKE pod spodem', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    await user.click(screen.getByRole('radio', { name: pl.library.pricingChoices.flat_hour }));
    await user.click(screen.getByRole('button', { name: pl.library.saveChanges }));

    // Osiem opcji w UI to trzy tryby liczenia × jednostka — user o tym nie wie.
    expect(updateMutate.mock.calls[0]?.[0]).toMatchObject({ patch: { unit: 'hour' } });
  });

  it('podglad odswieza sie BEZ zapisu', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    const name = screen.getByLabelText(pl.library.itemNameLabel);
    await user.clear(name);
    await user.type(name, 'Nowa nazwa');

    // Kryterium odbioru T-61: podglad reaguje na pisanie, zanim cokolwiek
    // trafi do bazy.
    expect(screen.getByText('Nowa nazwa')).toBeInTheDocument();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('zapis to JEDNO wywolanie, nie autozapis przy kazdym klawiszu', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    const name = screen.getByLabelText(pl.library.itemNameLabel);
    await user.type(name, ' 2');
    await user.click(screen.getByRole('button', { name: pl.library.saveChanges }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
  });

  it('usluga bez nazwy sie nie zapisuje', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    await user.clear(screen.getByLabelText(pl.library.itemNameLabel));
    await user.click(screen.getByRole('button', { name: pl.library.saveChanges }));

    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('mowi WPROST, ze kaskada z tej strony nie dziala', () => {
    // Udawanie, ze dziala wszedzie, konczyloby sie cichym brakiem zmian
    // w dokumencie, nad ktorym ktos wlasnie pracuje.
    renderPage([item()]);
    expect(screen.getByText(pl.library.cascadeHint)).toBeInTheDocument();
  });

  it('„Jak to dziala?" zmienia sie razem ze sposobem wyceny', async () => {
    const user = userEvent.setup();
    renderPage([item()]);

    expect(screen.getByText(pl.library.howItWorksText.flat)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: pl.library.pricingChoices.per_room }));
    expect(screen.getByText(pl.library.howItWorksText.per_room)).toBeInTheDocument();
  });

  it('statystyki: nieuzywana usluga dostaje ZDANIE, nie zero', () => {
    // „0" wyglada jak blad ladowania.
    renderPage([item()]);
    expect(screen.getByText(pl.library.usageNever)).toBeInTheDocument();
  });

  it('statystyki pokazuja liczbe wycen z RPC', () => {
    useLibraryUsage.mockReturnValue({
      data: [{ itemId: 'item-1', quotesCount: 3, lastUsedAt: '2026-08-20T10:00:00Z' }],
      isLoading: false,
    });
    renderPage([item()]);

    expect(screen.getByText(pl.library.usageCount(3))).toBeInTheDocument();
  });

  it('nowa usluga startuje z pustym formularzem i zapisuje sie jako nowa', async () => {
    const user = userEvent.setup();
    renderPage([], '/biblioteka/uslugi/nowa');

    await user.type(screen.getByLabelText(pl.library.itemNameLabel), 'Konsultacja');
    await user.click(screen.getByRole('button', { name: pl.library.saveChanges }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({ name: 'Konsultacja' });
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('nieznane id daje komunikat i droge powrotna, nie bialy ekran', () => {
    renderPage([], '/biblioteka/uslugi/nie-ma-takiej');
    expect(screen.getByText(pl.library.itemNotFoundTitle)).toBeInTheDocument();
  });
});
