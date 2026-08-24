import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newItem, newQuoteBody, newSection } from '@/domain/quote';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useLibrary', () => ({
  useLibraryItems,
  useAllLibraryItems: useLibraryItems,
}));

const { useEditorStore } = await import('./editor.store');
const { ItemVariantSelect } = await import('./components/ItemVariantSelect');
const { useVariantOptions, NO_VARIANTS } = await import('./useVariantOptions');
const { renderHook } = await import('@testing-library/react');

function libItem(partial: Partial<LibraryItem>): LibraryItem {
  return {
    id: 'lib-1',
    workspaceId: 'ws',
    category: 'Wizualizacje',
    categoryId: null,
    unit: 'lump' as const,
    unitLabel: null,
    minPriceCents: null,
    active: true,
    isSample: false,
    kind: 'item',
    name: 'Wizualizacja 3D',
    description: 'Statyczne ujęcia',
    unitPriceCents: 350_00,
    sortOrder: 0,
    variantOf: null,
    pricingBasis: 'amount',
    pricing: { mode: 'flat' },
    ...partial,
  };
}

const WIZ_3D = libItem({ id: 'wiz-3d', name: 'Wizualizacja 3D' });
const WIZ_360 = libItem({
  id: 'wiz-360',
  name: 'Wizualizacja 360',
  description: 'Panorama sferyczna',
  unitPriceCents: 500_00,
  variantOf: 'wiz-3d',
  pricing: { mode: 'per_frame', perRoomCents: {}, defaultPerRoomCents: 5000, baseCents: 0 },
});

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  useLibraryItems.mockReturnValue({ data: [WIZ_3D, WIZ_360] });
});

describe('useVariantOptions', () => {
  it('indeksuje grupę po KAŻDYM członku, nie po liderze', () => {
    // Wiersz wyceny wie tylko, którym wpisem jest — nie ma skąd znać lidera.
    const { result } = renderHook(() => useVariantOptions());

    expect(result.current.get('wiz-3d')?.map((v) => v.id)).toEqual(['wiz-3d', 'wiz-360']);
    expect(result.current.get('wiz-360')?.map((v) => v.id)).toEqual(['wiz-3d', 'wiz-360']);
  });

  it('pozycja bez wariantów nie trafia do mapy', () => {
    useLibraryItems.mockReturnValue({ data: [libItem({ id: 'sam', variantOf: null })] });
    const { result } = renderHook(() => useVariantOptions());

    expect(result.current.get('sam')).toBeUndefined();
  });

  it('pusta biblioteka zwraca STAŁĄ referencję', () => {
    // Nowa mapa przy każdym renderze przebiłaby `memo` na wszystkich wierszach
    // naraz — dokładnie ten błąd złapał kiedyś test wydajnościowy na `rooms`.
    useLibraryItems.mockReturnValue({ data: [] });
    const { result, rerender } = renderHook(() => useVariantOptions());
    const pierwsza = result.current;
    rerender();

    expect(result.current).toBe(pierwsza);
    expect(pierwsza).toBe(NO_VARIANTS);
  });

  it('biblioteka bez żadnych grup też daje stałą referencję', () => {
    useLibraryItems.mockReturnValue({ data: [libItem({ id: 'a' }), libItem({ id: 'b' })] });
    const { result } = renderHook(() => useVariantOptions());
    expect(result.current).toBe(NO_VARIANTS);
  });
});

describe('setItemVariant', () => {
  function zaladujWycene() {
    const pozycja = newItem({
      name: 'Wizualizacja 3D',
      description: 'Statyczne ujęcia',
      unitPriceCents: 350_00,
      qty: 3,
      libraryItemId: 'wiz-3d',
    });
    pozycja.enabled = false;
    pozycja.roomId = null;
    pozycja.frames = 8;

    useEditorStore.setState({
      body: newQuoteBody({
        title: 'Wycena',
        sections: [newSection({ title: 'Sekcja', items: [pozycja] })],
      }),
      quoteId: 'q1',
      lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
      saveState: 'idle',
    });
    return pozycja.id;
  }

  function pozycjaZeStore(id: string) {
    return useEditorStore.getState().body?.sections[0]?.items.find((i) => i.id === id);
  }

  it('podmienia to, CO jest wycenione', () => {
    const id = zaladujWycene();
    useEditorStore.getState().setItemVariant(id, {
      libraryItemId: WIZ_360.id,
      name: WIZ_360.name,
      description: WIZ_360.description,
      unitPriceCents: WIZ_360.unitPriceCents,
      pricing: WIZ_360.pricing,
    });

    const pozycja = pozycjaZeStore(id);
    expect(pozycja?.name).toBe('Wizualizacja 360');
    expect(pozycja?.description).toBe('Panorama sferyczna');
    expect(pozycja?.unitPriceCents).toBe(500_00);
    expect(pozycja?.pricing.mode).toBe('per_frame');
    expect(pozycja?.libraryItemId).toBe('wiz-360');
  });

  it('NIE rusza decyzji podjętych w tej wycenie', () => {
    // Ilość, TAK/NIE i przypisanie do pomieszczenia należą do dokumentu,
    // a nie do biblioteki. `frames` zostaje, żeby powrót do wariantu
    // liczonego za kadr pamiętał, ile ich było.
    const id = zaladujWycene();
    useEditorStore.getState().setItemVariant(id, {
      libraryItemId: WIZ_360.id,
      name: WIZ_360.name,
      description: WIZ_360.description,
      unitPriceCents: WIZ_360.unitPriceCents,
      pricing: WIZ_360.pricing,
    });

    const pozycja = pozycjaZeStore(id);
    expect(pozycja?.id).toBe(id);
    expect(pozycja?.qty).toBe(3);
    expect(pozycja?.enabled).toBe(false);
    expect(pozycja?.frames).toBe(8);
  });

  it('oznacza dokument jako niezapisany', () => {
    const id = zaladujWycene();
    useEditorStore.getState().setItemVariant(id, {
      libraryItemId: WIZ_360.id,
      name: WIZ_360.name,
      description: WIZ_360.description,
      unitPriceCents: WIZ_360.unitPriceCents,
      pricing: WIZ_360.pricing,
    });

    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('nieznana pozycja nie brudzi dokumentu', () => {
    zaladujWycene();
    useEditorStore.getState().setItemVariant('nie-ma', {
      libraryItemId: 'x',
      name: 'X',
      description: '',
      unitPriceCents: 0,
      pricing: { mode: 'flat' },
    });

    // Inaczej autozapis leciałby po nic.
    expect(useEditorStore.getState().saveState).toBe('idle');
  });
});

describe('ItemVariantSelect', () => {
  it('milczy, gdy nie ma z czego wybierać', () => {
    const { container } = render(
      <ItemVariantSelect variants={[WIZ_3D]} currentId="wiz-3d" onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('pokazuje wybrany wariant, a nie pierwszy z listy', () => {
    render(<ItemVariantSelect variants={[WIZ_3D, WIZ_360]} currentId="wiz-360" onChange={vi.fn()} />);
    expect(screen.getByLabelText(pl.editor.itemVariantLabel)).toHaveTextContent('Wizualizacja 360');
  });

  it('podaje w górę komplet pól wariantu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ItemVariantSelect variants={[WIZ_3D, WIZ_360]} currentId="wiz-3d" onChange={onChange} />);

    await user.click(screen.getByLabelText(pl.editor.itemVariantLabel));
    await user.click(screen.getByRole('option', { name: 'Wizualizacja 360' }));

    expect(onChange).toHaveBeenCalledWith({
      libraryItemId: 'wiz-360',
      name: 'Wizualizacja 360',
      description: 'Panorama sferyczna',
      unitPriceCents: 500_00,
      pricing: WIZ_360.pricing,
    });
  });
});
