import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newQuoteBody, newSection } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { newPriceListDoc } from '@/domain/documents';

const useWorkspace = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useWorkspace', () => ({ useWorkspace, useWorkspaceId: () => 'ws-1' }));

// Biblioteka dokumentow (T-103): panel „Dodaj z biblioteki" i zapis wiersza
// pytaja o wpisy — test komponentu izoluje sie od TanStack Query.
vi.mock('@/data/queries/useLibraryDocs', () => ({
  useDocLibrary: () => ({ data: [], isLoading: false, isError: false }),
  useDocLibraryEntries: () => ({ entries: [], data: [], isLoading: false, isError: false }),
  useCreateDocLibraryEntry: () => ({ mutate: vi.fn(), isPending: false }),
}));

/*
 * Grupy i zestawy bibliotek dokumentow (T-121). Panel „Dodaj z biblioteki"
 * pyta o nie razem z wpisami — test komponentu izoluje sie od TanStack Query.
 */
vi.mock('@/data/queries/useLibraryDocGroups', () => ({
  useDocCategories: () => ({ data: [], isLoading: false, isError: false }),
  useDocCategoryMap: () => new Map(),
  useDocSets: () => ({ data: [], isLoading: false, isError: false }),
  useSetDocEntryCategory: () => ({ mutate: vi.fn(), isPending: false }),
  // „Zapisz jako zestaw" w pasku akcji dokumentu (T-122).
  useCreateDocSet: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: vi.fn() },
}));

const { PriceListTab } = await import('./PriceListTab');
const { useEditorStore } = await import('../editor.store');

/** `seed = true` zaklada cennik z wbudowanym szablonem — patrz StagesDocTab.test. */
function zaladuj(
  body = newQuoteBody({ sections: [newSection({ title: 'Etap wizualny' })] }),
  seed = true,
) {
  useEditorStore.setState({
    body,
    schedule: null,
    documents: seed ? { stages: null, priceList: newPriceListDoc({}, null) } : null,
    quoteId: 'q1',
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
}

function cennik() {
  return useEditorStore.getState().documents?.priceList ?? null;
}

function wycena() {
  return useEditorStore.getState().body;
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkspace.mockReturnValue({ data: { settings: { priceListTemplate: null } } });
  useEditorStore.getState().reset();
});

describe('PriceListTab — zakładanie cennika', () => {
  it('pierwsze wejście w trybie edycji zakłada PUSTY cennik — pozycje z biblioteki (T-111)', () => {
    zaladuj(undefined, false);
    render(<PriceListTab editing />);
    expect(cennik()).not.toBeNull();
    expect(cennik()?.items).toHaveLength(0);
    expect(screen.getByText(pl.editor.priceListEmptyItemsEditing)).toBeInTheDocument();
  });

  it('NIE zakłada cennika w podglądzie', () => {
    zaladuj(undefined, false);
    render(<PriceListTab editing={false} />);

    expect(cennik()).toBeNull();
    expect(useEditorStore.getState().saveState).toBe('idle');
    expect(screen.getByText(pl.editor.priceListEmpty)).toBeInTheDocument();
  });

  it('nie rusza etapów, które już są w dokumencie', () => {
    // Dwa dokumenty w jednym polu `documents` — zalozenie jednego nie moze
    // skasowac drugiego.
    zaladuj();
    useEditorStore.getState().ensureStagesDoc(null);
    const etapy = cennikStages();

    render(<PriceListTab editing />);
    expect(cennikStages()).toBe(etapy);
    expect(cennik()).not.toBeNull();
  });
});

function cennikStages() {
  return useEditorStore.getState().documents?.stages?.entries.length ?? null;
}

describe('PriceListTab — przedział cen', () => {
  it('pozycja bez górnej granicy pokazuje jedną cenę', () => {
    zaladuj();
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({ name: 'Konsultacja', priceMinCents: 25_000 });

    render(<PriceListTab editing={false} />);
    expect(screen.getByText(/250/)).toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  it('pozycja z przedziałem pokazuje widełki', () => {
    zaladuj();
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore
      .getState()
      .addPriceListItem({ name: 'Rzut', priceMinCents: 30_000, priceMaxCents: 120_000 });

    render(<PriceListTab editing={false} />);
    expect(screen.getByText(/300–1200/)).toBeInTheDocument();
  });
});

describe('PriceListTab — most z dwoma efektami (T-64)', () => {
  function zUslugaNaDni(addedDays: number | null = 3) {
    zaladuj();
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({
      name: 'Panorama 360',
      priceMinCents: 45_000,
      addedDays,
    });
  }

  function harmonogram() {
    return useEditorStore.getState().schedule;
  }

  async function otworzMost(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));
  }

  it('pozycja BEZ `addedDays` zostaje zwyklym linkiem, bez pytania', async () => {
    // Jeden efekt nie potrzebuje wyboru — pytanie byloby ceremonia bez tresci.
    const user = userEvent.setup();
    zUslugaNaDni(null);
    render(<PriceListTab editing />);

    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    expect(wycena()?.sections[0]?.items).toHaveLength(1);
    expect(harmonogram()).toBeNull();
  });

  it('oba efekty naraz: pozycja w wycenie i dni w terminie', async () => {
    const user = userEvent.setup();
    zUslugaNaDni(3);
    render(<PriceListTab editing />);

    await otworzMost(user);
    await user.click(screen.getByRole('button', { name: pl.editor.addToQuoteConfirm }));

    expect(wycena()?.sections[0]?.items).toHaveLength(1);
    const etap = harmonogram()?.stages.find((stage) => stage.kind === 'extras');
    expect(etap?.baseDays).toBe(3);
    expect(etap?.extras[0]?.name).toBe('Panorama 360');
  });

  it('odznaczony koszt dodaje TYLKO dni', async () => {
    const user = userEvent.setup();
    zUslugaNaDni(3);
    render(<PriceListTab editing />);

    await otworzMost(user);
    await user.click(screen.getByRole('switch', { name: pl.editor.addToQuoteCost }));
    await user.click(screen.getByRole('button', { name: pl.editor.addToQuoteConfirm }));

    expect(wycena()?.sections[0]?.items ?? []).toHaveLength(0);
    expect(harmonogram()?.stages.find((stage) => stage.kind === 'extras')?.baseDays).toBe(3);
  });

  it('odznaczony termin dodaje TYLKO pozycje', async () => {
    const user = userEvent.setup();
    zUslugaNaDni(3);
    render(<PriceListTab editing />);

    await otworzMost(user);
    await user.click(screen.getByRole('switch', { name: pl.editor.addToQuoteSchedule(3) }));
    await user.click(screen.getByRole('button', { name: pl.editor.addToQuoteConfirm }));

    expect(wycena()?.sections[0]?.items).toHaveLength(1);
    expect(harmonogram()).toBeNull();
  });

  it('bez harmonogramu uprzedza, ze go zalozy — i zaklada', async () => {
    const user = userEvent.setup();
    zUslugaNaDni(3);
    render(<PriceListTab editing />);

    await otworzMost(user);
    expect(screen.getByText(pl.editor.addToQuoteScheduleNew)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.editor.addToQuoteConfirm }));
    expect(harmonogram()).not.toBeNull();
  });

  it('oba przelaczniki odznaczone blokuja potwierdzenie', async () => {
    const user = userEvent.setup();
    zUslugaNaDni(3);
    render(<PriceListTab editing />);

    await otworzMost(user);
    await user.click(screen.getByRole('switch', { name: pl.editor.addToQuoteCost }));
    await user.click(screen.getByRole('switch', { name: pl.editor.addToQuoteSchedule(3) }));

    expect(screen.getByRole('button', { name: pl.editor.addToQuoteConfirm })).toBeDisabled();
  });
});

describe('PriceListTab — most do wyceny (F6.2)', () => {
  function zPozycja() {
    zaladuj();
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({
      name: 'Dodatkowy rzut',
      description: 'Rysunek wykonawczy.',
      priceMinCents: 30_000,
      priceMaxCents: 120_000,
    });
  }

  it('dodaje pozycję do wyceny z DOLNĄ granicą przedziału', async () => {
    /*
     * Z widelek trzeba wybrac jedna liczbe. Gorna zawyzylaby oferte bez
     * pytania — dolna jest jedyna, ktora nie obiecuje klientowi wiecej,
     * niz uzgodniono.
     */
    const user = userEvent.setup();
    zPozycja();
    render(<PriceListTab editing />);

    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    const pozycje = wycena()?.sections[0]?.items ?? [];
    expect(pozycje).toHaveLength(1);
    expect(pozycje[0]?.name).toBe('Dodatkowy rzut');
    expect(pozycje[0]?.description).toBe('Rysunek wykonawczy.');
    expect(pozycje[0]?.unitPriceCents).toBe(30_000);
  });

  it('mówi, gdzie pozycja wylądowała i skąd wzięła się kwota', async () => {
    const user = userEvent.setup();
    zPozycja();
    render(<PriceListTab editing />);

    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    expect(toastSuccess).toHaveBeenCalledWith(
      pl.editor.priceListAddedToQuote('Dodatkowy rzut'),
      expect.objectContaining({
        description: pl.editor.priceListAddedToQuoteHint('Etap wizualny'),
      }),
    );
  });

  it('wycena bez sekcji dostaje sekcję, zamiast po cichu nic nie zrobić', async () => {
    const user = userEvent.setup();
    zaladuj(newQuoteBody({ sections: [] }));
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({ name: 'Konsultacja', priceMinCents: 15_000 });

    render(<PriceListTab editing />);
    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    expect(wycena()?.sections).toHaveLength(1);
    expect(wycena()?.sections[0]?.items).toHaveLength(1);
  });

  it('w wycenie godzinowej PRZELICZA kwotę po stawce', async () => {
    // 300 zl przy stawce 60 zl/h to 300 minut, a nie 300 groszy.
    const user = userEvent.setup();
    zaladuj(
      newQuoteBody({
        sections: [newSection({ title: 'Etap' })],
        pricingBasis: 'time',
        hourlyRateCents: 6_000,
      }),
    );
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({ name: 'Rzut', priceMinCents: 30_000 });

    render(<PriceListTab editing />);
    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    expect(wycena()?.sections[0]?.items[0]?.unitPriceCents).toBe(300);
  });

  it('bez stawki godzinowej ODMAWIA, zamiast wpisać liczbę z sufitu', async () => {
    const user = userEvent.setup();
    zaladuj(
      newQuoteBody({
        sections: [newSection({ title: 'Etap' })],
        pricingBasis: 'time',
        hourlyRateCents: null,
      }),
    );
    useEditorStore.getState().ensurePriceListDoc(null);
    useEditorStore.getState().patchPriceListDoc({ items: [] });
    useEditorStore.getState().addPriceListItem({ name: 'Rzut', priceMinCents: 30_000 });

    render(<PriceListTab editing />);
    await user.click(screen.getByText(pl.editor.addPriceListItemToQuote));

    expect(wycena()?.sections[0]?.items).toHaveLength(0);
    expect(toastError).toHaveBeenCalledWith(pl.editor.libraryBasisMismatch);
  });

  it('w podglądzie nie ma mostu do wyceny', () => {
    zPozycja();
    render(<PriceListTab editing={false} />);
    expect(screen.queryByText(pl.editor.addPriceListItemToQuote)).not.toBeInTheDocument();
  });
});

describe('PriceListTab — edycja', () => {
  it('dopisana pozycja trafia do cennika', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<PriceListTab editing />);

    const przed = cennik()?.items.length ?? 0;
    await user.click(screen.getByText(pl.editor.docLibrary.manual.price_list));

    expect(cennik()?.items).toHaveLength(przed + 1);
  });

  it('dodanie pozycji nie wsypuje obiektu zdarzenia do dokumentu', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<PriceListTab editing />);

    await user.click(screen.getByText(pl.editor.docLibrary.manual.price_list));
    expect(() => JSON.stringify(cennik())).not.toThrow();
  });

  it('ważność cennika jest osobna od oferty', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<PriceListTab editing />);

    expect(cennik()?.validDays).toBe(14);

    const pole = screen.getByLabelText(pl.editor.priceListValidDays);
    await user.clear(pole);
    await user.type(pole, '30');

    expect(cennik()?.validDays).toBe(30);
  });
});
