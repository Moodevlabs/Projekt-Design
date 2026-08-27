import { render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem, LibraryItemPatch } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useAllLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryCategories = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const deleteMutate = vi.hoisted(() => vi.fn());
const linkedCount = vi.hoisted(() => vi.fn());
const applyCascade = vi.hoisted(() => vi.fn());

/**
 * Zapis pozycji: mock odgrywa udany round-trip, czyli woła `onSuccess`
 * z pozycją po zmianach — tylko wtedy da się sprawdzić kaskadę.
 */
const updateMutate = vi.hoisted(() =>
  vi.fn(
    (
      vars: { id: string; patch: LibraryItemPatch },
      options?: { onSuccess?: (saved: LibraryItem) => void },
    ) => {
      const saved: LibraryItem = { ...baseItem(), ...vars.patch, id: vars.id };
      options?.onSuccess?.(saved);
    },
  ),
);

function baseItem(partial: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'item-1',
    workspaceId: 'ws',
    categoryName: 'Wykończenie',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    name: 'Blat kuchenny',
    description: 'Dąb lity, 40 mm',
    unitPriceCents: 250_000,
    sortOrder: 10,
    variantOf: null,
    pricingBasis: 'amount',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useAllLibraryItems,
  useLibraryCategories,
  useCreateLibraryItem: () => ({ mutate: createMutate, isPending: false }),
  useUpdateLibraryItem: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteLibraryItem: () => ({ mutate: deleteMutate, isPending: false }),
}));

// Slownik grup (T-59) — pigulki filtrow ida z niego, nie z tekstowej kolumny.
vi.mock('@/data/queries/useLibraryCategories', () => ({
  useLibraryCategoryList: () => ({
    data: [
      {
        id: 'cat-1',
        workspaceId: 'ws',
        name: 'Wykończenie',
        code: '',
        color: null,
        sortOrder: 0,
        isSample: false,
      },
      {
        id: 'cat-2',
        workspaceId: 'ws',
        name: 'Instalacje',
        code: '',
        color: null,
        sortOrder: 1,
        isSample: false,
      },
    ],
    isLoading: false,
  }),
  useCreateLibraryCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateLibraryCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteLibraryCategory: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderLibraryCategories: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/quotes/editor/useLibraryCascade', () => ({
  useLibraryCascade: () => ({ linkedCount, apply: applyCascade }),
}));

// Edytor reguł cenowych czyta słownik typów pomieszczeń (T-33).
vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes: () => ({
    data: [
      { id: 'rt-kuchnia', workspaceId: 'ws', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 10 },
      { id: 'rt-salon', workspaceId: 'ws', name: 'Salon', slug: 'salon', sortOrder: 20 },
    ],
  }),
}));

const { LibraryItemsTab } = await import('./LibraryItemsTab');

/**
 * Karta uslugi prowadzi do pelnej strony edytora (T-61), wiec potrzebuje
 * routera. Zawijamy raz, zamiast dopisywac go w kazdym tescie.
 */
function render(ui: React.ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>);
}

function mockItems(rows: LibraryItem[], overrides: Record<string, unknown> = {}) {
  useLibraryItems.mockReturnValue({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
  // Niefiltrowana lista (grupy wariantow) — te same dane, osobne wywolanie.
  useAllLibraryItems.mockReturnValue({ data: rows, isLoading: false, isError: false });
}

/** Ostatnie filtry, z jakimi zakładka zawołała hooka danych. */
function lastFilters(): Record<string, unknown> {
  const calls = useLibraryItems.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

/** Etykieta przycisku karty (klucze i18n sa funkcjami nazwy pozycji). */
function label(key: (name: string) => string, name = 'Blat kuchenny') {
  return key(name);
}

/** Etykieta pola karty: „Nazwa pozycji: Blat kuchenny”. */
function fieldLabel(base: string, name = 'Blat kuchenny') {
  return `${base}: ${name}`;
}

/** Wiersze są zwinięte (T-72) — formularz karty widać dopiero po kliknięciu. */
async function expand(user: ReturnType<typeof userEvent.setup>, name = 'Blat kuchenny') {
  await user.click(screen.getByRole('button', { name: pl.library.rowExpand(name) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  linkedCount.mockReturnValue(0);
  useLibraryCategories.mockReturnValue({ data: ['Wykończenie', 'Instalacje'], isLoading: false });
  mockItems([baseItem()]);
});

describe('LibraryItemsTab — filtry', () => {
  it('przekazuje fraze wyszukiwania do zapytania, a nie filtruje w przegladarce', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.type(screen.getByLabelText(pl.library.searchPlaceholder), 'blat');
    expect(lastFilters().search).toBe('blat');
  });

  it('nie wysyla pustej frazy jako filtra', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.type(screen.getByLabelText(pl.library.searchPlaceholder), '   ');
    expect(lastFilters().search).toBeUndefined();
  });

  it('przekazuje grupe ze SLOWNIKA do zapytania, nie nazwe tekstowa', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    // Od T-59 filtrujemy po `category_id`: nazwa moze sie zmienic (literowka
    // w „Instalacje"), a przypisanie uslug ma to przezyc.
    expect(lastFilters().categoryId).toBeUndefined();
    await user.click(screen.getByRole('button', { name: 'Instalacje' }));
    expect(lastFilters().categoryId).toBe('cat-2');
  });

  it('„Bez grupy" tez jest filtrem — uslugi po usunietej grupie nie znikaja', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.click(screen.getByRole('button', { name: pl.library.withoutCategory }));
    expect(lastFilters().categoryId).toBe('none');
  });

  it('rozroznia pusta biblioteke od pustego wyniku filtrowania', async () => {
    const user = userEvent.setup();
    mockItems([]);
    render(<LibraryItemsTab />);

    expect(screen.getByText(pl.library.itemsEmptyTitle)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Wykończenie' }));
    expect(screen.getByText(pl.library.itemsNoResultsTitle)).toBeInTheDocument();
  });

  it('dodanie pozycji czysci fraze, zeby nowa pozycja nie zniknela z widoku', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    const search = screen.getByLabelText(pl.library.searchPlaceholder);
    await user.type(search, 'blat');
    await user.click(screen.getByRole('button', { name: pl.library.addItem }));

    // „Nowa pozycja" nie pasuje do frazy „blat" — bez czyszczenia przycisk
    // wygladalby na zepsuty: pozycja powstaje, ale nie ma jej na ekranie.
    expect(createMutate.mock.calls[0]?.[0]).toEqual({
      name: pl.library.newItemName,
      categoryId: null,
    });
    expect(search).toHaveValue('');
    expect(lastFilters().search).toBeUndefined();
  });

  it('dodanie pozycji zostawia grupe i wklada w nia nowa pozycje', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.click(screen.getByRole('button', { name: 'Instalacje' }));
    await user.click(screen.getByRole('button', { name: pl.library.addItem }));

    expect(createMutate.mock.calls[0]?.[0]).toEqual({
      name: pl.library.newItemName,
      categoryId: 'cat-2',
      // Kolumna tekstowa zostaje jako kopia do czasu T-69.
    });
    expect(lastFilters().categoryId).toBe('cat-2');
  });

  it('pokazuje blad wczytywania z mozliwoscia ponowienia', () => {
    const refetch = vi.fn();
    mockItems([], { isError: true, refetch });
    render(<LibraryItemsTab />);

    expect(screen.getByText(new RegExp(pl.library.loadError))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.common.retry })).toBeInTheDocument();
  });
});

describe('LibraryItemsTab — zwijane wiersze (T-72)', () => {
  it('wiersz jest zwiniety i mowi, czym sie rozni pozycja: sposob wyceny i stawka', () => {
    mockItems([baseItem({ unit: 'm2', unitPriceCents: 1_200 })]);
    render(<LibraryItemsTab />);

    // Formularza nie ma, dopoki nikt nie kliknie — 38 rozlozonych kart to sciana.
    expect(screen.queryByLabelText(fieldLabel(pl.library.itemNameLabel))).not.toBeInTheDocument();
    expect(screen.getAllByText(pl.library.pricingChoices.flat_m2).length).toBeGreaterThan(0);
    expect(screen.getAllByText('12,00 zł / m²').length).toBeGreaterThan(0);
  });

  it('klik rozwija formularz, drugi klik zwija', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await expand(user);
    expect(screen.getByLabelText(fieldLabel(pl.library.itemNameLabel))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.library.rowCollapse('Blat kuchenny') }));
    expect(screen.queryByLabelText(fieldLabel(pl.library.itemNameLabel))).not.toBeInTheDocument();
  });

  it('klik w ptaszek tez rozwija wiersz', async () => {
    // Regresja z 2026-08-27: strzałka była samą grafiką poza przyciskiem,
    // więc jedyny element wyglądający jak „rozwiń" nie robił nic.
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.click(screen.getByTestId('library-item-chevron'));
    expect(screen.getByLabelText(fieldLabel(pl.library.itemNameLabel))).toBeInTheDocument();
  });

  it('rozwiniety jest co najwyzej jeden wiersz', async () => {
    const user = userEvent.setup();
    mockItems([baseItem(), baseItem({ id: 'item-2', name: 'Fronty' })]);
    render(<LibraryItemsTab />);

    await expand(user);
    await expand(user, 'Fronty');

    expect(screen.queryByLabelText(fieldLabel(pl.library.itemNameLabel))).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(fieldLabel(pl.library.itemNameLabel, 'Fronty')),
    ).toBeInTheDocument();
  });

  it('przelacznik „Aktywna" zmienia stan z listy, bez rozwijania', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);

    await user.click(
      screen.getByRole('switch', { name: pl.library.rowToggleActive('Blat kuchenny') }),
    );

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0]?.[0]).toEqual({ id: 'item-1', patch: { active: false } });
    expect(screen.queryByLabelText(fieldLabel(pl.library.itemNameLabel))).not.toBeInTheDocument();
  });
});

describe('LibraryItemsTab — edycja pozycji', () => {
  it('zapisuje cene przepuszczona przez parseMoney (grosze, nie zlotowki)', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);
    await expand(user);

    const price = screen.getByLabelText(fieldLabel(pl.library.itemPriceLabel));
    await user.clear(price);
    await user.type(price, '1 200,50');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const [vars] = updateMutate.mock.calls[0] ?? [];
    expect(vars?.patch.unitPriceCents).toBe(120_050);
  });

  it('rozpoznaje rabat: pokazuje znak minus przy kwocie', async () => {
    const user = userEvent.setup();
    mockItems([baseItem({ kind: 'discount', name: 'Rabat stałego klienta' })]);
    render(<LibraryItemsTab />);
    await expand(user, 'Rabat stałego klienta');

    expect(
      screen.getByRole('button', { name: pl.library.kindDiscount, pressed: true }),
    ).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('usuwa dopiero po potwierdzeniu w dialogu', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);
    await expand(user);

    await user.click(screen.getByRole('button', { name: label(pl.library.deleteItem) }));
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: pl.common.delete }));
    expect(deleteMutate).toHaveBeenCalledWith('item-1');
  });
});

describe('LibraryItemsTab — reguly cenowe', () => {
  it('przelaczenie na „za pomieszczenie” zapisuje regule z macierza stawek', async () => {
    const user = userEvent.setup();
    render(<LibraryItemsTab />);
    await expand(user);

    await user.click(
      screen.getByRole('button', {
        name: new RegExp(`${pl.library.pricingLabel}: ${pl.library.pricingFlat}`),
      }),
    );
    await user.click(screen.getByRole('button', { name: pl.library.pricingPerRoom }));

    // Stawka za konkretny typ pomieszczenia — to odwzorowanie kolumn F–S arkusza.
    const stawka = screen.getByLabelText(pl.library.pricingRoomPrice('Kuchnia'));
    await user.clear(stawka);
    await user.type(stawka, '150');

    await user.click(screen.getByRole('button', { name: pl.library.saveItem('Blat kuchenny') }));

    const patch = updateMutate.mock.calls[0]?.[0] as { patch: { pricing?: unknown } };
    expect(patch.patch.pricing).toMatchObject({
      mode: 'per_room',
      perRoomCents: { 'rt-kuchnia': 15_000 },
    });
  });

  it('powrot na „stala” nie zostawia smieci po trybie parametrycznym', async () => {
    const user = userEvent.setup();
    mockItems([
      baseItem({
        pricing: {
          mode: 'per_room',
          baseCents: 20_000,
          perRoomCents: { 'rt-kuchnia': 5_000 },
          defaultPerRoomCents: 1_500,
          roomScope: 'all',
        },
      }),
    ]);
    render(<LibraryItemsTab />);
    await expand(user);

    await user.click(screen.getByRole('button', { name: pl.library.pricingFlat }));
    await user.click(screen.getByRole('button', { name: pl.library.saveItem('Blat kuchenny') }));

    const patch = updateMutate.mock.calls[0]?.[0] as { patch: { pricing?: unknown } };
    expect(patch.patch.pricing).toEqual({ mode: 'flat' });
  });
});

describe('LibraryItemsTab — kaskada do otwartej wyceny', () => {
  async function editNameAndSave(user: ReturnType<typeof userEvent.setup>) {
    await expand(user);
    const name = screen.getByLabelText(fieldLabel(pl.library.itemNameLabel));
    await user.clear(name);
    await user.type(name, 'Blat dębowy');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));
  }

  it('nie pyta o nic, gdy zadna pozycja wyceny nie pochodzi z tego wpisu', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(0);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
    expect(applyCascade).not.toHaveBeenCalled();
  });

  it('pyta i podaje LICZBE pozycji, gdy wycena ma powiazane pozycje', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(2);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);

    expect(screen.getByText(pl.library.cascadeTitle)).toBeInTheDocument();
    expect(screen.getByText(/2 pozycje/)).toBeInTheDocument();
  });

  it('po potwierdzeniu kaskaduje tylko zmienione pola', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(2);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);
    await user.click(screen.getByRole('button', { name: pl.library.cascadeConfirm }));

    expect(applyCascade).toHaveBeenCalledWith('item-1', { name: 'Blat dębowy' });
  });

  it('odmowa zostawia zmiane w bibliotece i NIE rusza wyceny', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(3);
    render(<LibraryItemsTab />);

    await editNameAndSave(user);
    await user.click(screen.getByRole('button', { name: pl.library.cascadeDismiss }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(applyCascade).not.toHaveBeenCalled();
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
  });

  it('nie pyta, gdy zmienilo sie wylacznie pole spoza kaskady (grupa)', async () => {
    const user = userEvent.setup();
    linkedCount.mockReturnValue(5);
    render(<LibraryItemsTab />);
    await expand(user);

    // Od T-69 grupa to WYBOR ze slownika, nie pole tekstowe: nazwa nie jest
    // juz kopiowana do wiersza, wiec nie da sie jej rozjechac ze slownikiem.
    const category = screen.getByLabelText(fieldLabel(pl.library.itemCategoryLabel));
    await user.selectOptions(category, 'cat-2');
    await user.click(screen.getByRole('button', { name: label(pl.library.saveItem) }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(pl.library.cascadeTitle)).not.toBeInTheDocument();
    expect(applyCascade).not.toHaveBeenCalled();
  });
});
