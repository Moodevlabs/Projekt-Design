import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newQuoteBody, newSection } from '@/domain/quote';
import { pl } from '@/i18n/pl';

const useWorkspace = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useWorkspace', () => ({ useWorkspace, useWorkspaceId: () => 'ws-1' }));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: vi.fn() },
}));

const { PriceListTab } = await import('./PriceListTab');
const { useEditorStore } = await import('../editor.store');

function zaladuj(body = newQuoteBody({ sections: [newSection({ title: 'Etap wizualny' })] })) {
  useEditorStore.setState({
    body,
    schedule: null,
    documents: null,
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
  it('pierwsze wejście w trybie edycji zakłada cennik z szablonu', () => {
    zaladuj();
    render(<PriceListTab editing />);
    expect(cennik()?.items.length).toBeGreaterThanOrEqual(10);
  });

  it('NIE zakłada cennika w podglądzie', () => {
    zaladuj();
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
    await user.click(screen.getByText(pl.editor.addPriceListItem));

    expect(cennik()?.items).toHaveLength(przed + 1);
  });

  it('dodanie pozycji nie wsypuje obiektu zdarzenia do dokumentu', async () => {
    const user = userEvent.setup();
    zaladuj();
    render(<PriceListTab editing />);

    await user.click(screen.getByText(pl.editor.addPriceListItem));
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
