import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ItemRow } from './ItemRow';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS } from '@/domain/quote';
import { newItem, type Item } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/** Wiersz żyje w kontekście przeciągania — bez niego `useSortable` nie ma o co pytać. */
function Dnd({ ids, children }: { ids: string[]; children: ReactNode }) {
  return (
    <DndContext>
      <SortableContext items={ids}>{children}</SortableContext>
    </DndContext>
  );
}

/** Wiersz bez wariantow — domyslny przypadek. Stala referencja, jak w apce. */
const BEZ_WARIANTOW = {
  variants: NO_VARIANTS,
  onVariantChange: vi.fn(),
  textInfo: { rooms: [], client: '' },
  pricing: AMOUNT_BASIS,
};

function setup(overrides: Partial<Item> = {}, editing = true) {
  const item = newItem({ name: 'Blat kuchenny', unitPriceCents: 120_000, ...overrides });
  const handlers = {
    onToggle: vi.fn(),
    onPatch: vi.fn(),
    onRemove: vi.fn(),
  };

  render(
    <Dnd ids={[item.id]}>
      <ItemRow
        item={item}
        editing={editing}
        currency="PLN"
        rooms={[]}
        {...BEZ_WARIANTOW}
        {...handlers}
      />
    </Dnd>,
  );
  return { item, ...handlers };
}

describe('ItemRow', () => {
  it('przelacza pozycje', async () => {
    const user = userEvent.setup();
    const { item, onToggle } = setup();

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(item.id);
  });

  it('przelacznik dziala takze w podgladzie — to jest sedno produktu', async () => {
    const user = userEvent.setup();
    const { item, onToggle } = setup({}, false);

    await user.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(item.id);
  });

  it('w podgladzie nie ma pol edycji ani usuwania', () => {
    setup({}, false);

    expect(screen.queryByLabelText(pl.editor.itemPriceLabel)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(pl.editor.itemQtyLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Usuń pozycję/ })).not.toBeInTheDocument();
    // Nazwa zostaje, ale jako TEKST, nie pole formularza. `readonly` input
    // nie potrafi zawijać, więc dłuższe wartości byłyby ucinane; poza tym
    // czytnik ekranu ogłaszałby podgląd jako formularz.
    expect(screen.getByLabelText(pl.editor.itemNameLabel)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('wylaczona pozycja zmienia kolor, a NIE znika i nie jest przekreslona', () => {
    setup({ enabled: false }, false);
    const name = screen.getByLabelText(pl.editor.itemNameLabel);

    // Klient ma dalej czytac, z czego rezygnuje — zadnego opacity ani line-through.
    expect(name).toBeVisible();
    expect(name.className).not.toMatch(/line-through|opacity/);
    expect(name.className).toContain('text-[var(--doc-ink-soft)]');
  });

  it('rabat dostaje znak minus i kolor terakoty', () => {
    setup({ kind: 'discount', enabled: true }, false);

    expect(screen.getByText('−')).toBeInTheDocument();
    const amount = screen.getByText(/1\s?200,00/);
    expect(amount.closest('div')?.className).toContain('--doc-terracotta');
  });

  it('w podgladzie pokazuje stawke tylko wtedy, gdy ilosc jest rozna od jedynki', () => {
    const a = newItem({ name: 'A', qty: 1, unitPriceCents: 1000 });
    const { unmount } = render(
      <Dnd ids={[a.id]}>
        <ItemRow
          item={a}
          editing={false}
          currency="PLN"
          rooms={[]}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );
    // Ryczalt z iloscia 1: ani „1 ×", ani stawki — sama kwota.
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    unmount();

    const b = newItem({ name: 'B', qty: 2.5, unitPriceCents: 1000 });
    render(
      <Dnd ids={[b.id]}>
        <ItemRow
          item={b}
          editing={false}
          currency="PLN"
          rooms={[]}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );
    // Od 2026-09-09 stawka stoi NAD kwota, bez znaku mnozenia: „2,5 · 10,00 zl".
    // Ulamek z przecinkiem, jak w PL (T-60).
    expect(screen.getByText(/^2,5 · 10,00\s?zł$/)).toBeInTheDocument();
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it('w podgladzie pokazuje wartosc pozycji, czyli ilosc razy cena', () => {
    setup({ qty: 3, unitPriceCents: 10_000 }, false);
    expect(screen.getByText(/300,00/)).toBeInTheDocument();
  });

  it('daje uchwyt przeciagania tylko w trybie edycji', () => {
    setup({}, false);
    expect(screen.queryByRole('button', { name: /Przenieś pozycję/ })).not.toBeInTheDocument();
  });

  it('uchwyt przeciagania jest przyciskiem z etykieta — sensor klawiatury tego wymaga', () => {
    setup();
    const handle = screen.getByRole('button', { name: /Przenieś pozycję: Blat kuchenny/ });
    expect(handle).toBeInTheDocument();
  });

  it('przy pozycji nie ma juz przycisku zapisu do biblioteki (T-112)', () => {
    setup({});
    expect(screen.queryByRole('button', { name: /Zapisz do biblioteki/ })).not.toBeInTheDocument();
  });

  it('usuwa pozycje', async () => {
    const user = userEvent.setup();
    const { item, onRemove } = setup();

    await user.click(screen.getByRole('button', { name: /Usuń pozycję/ }));
    expect(onRemove).toHaveBeenCalledWith(item.id);
  });
});

describe('ItemRow — pozycja liczona za pomieszczenie', () => {
  const rooms = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      roomTypeId: null,
      label: 'Kuchnia',
      qty: 2,
      includedInVisual: true,
      includedInTechnical: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      roomTypeId: null,
      label: 'Salon',
      qty: 1,
      includedInVisual: false,
      includedInTechnical: true,
    },
  ];

  const parametryczna = newItem({
    name: 'Projekt budowlany',
    unitPriceCents: 0,
    pricing: {
      mode: 'per_room',
      baseCents: 20_000,
      perRoomCents: {},
      defaultPerRoomCents: 1_500,
      roomScope: 'technical',
    },
  });

  it('pokazuje kwote z reguly, a nie `qty × cena jednostkowa`', () => {
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={parametryczna}
          editing={false}
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );

    // 200 zl bazy + 3 pomieszczenia techniczne (kuchnia x2 + salon) × 15 zl.
    expect(screen.getByText(/245,00/)).toBeInTheDocument();
  });

  it('pisze, skad ta kwota — z liczba pomieszczen zgodna z zasiegiem reguly', () => {
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={parametryczna}
          editing
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );

    expect(screen.getByText(/200,00.*\+ 3 pom\./)).toBeInTheDocument();
  });

  it('w trybie edycji kratka pokazuje WYNIK, a wpis jest nadpisaniem recznym (T-127)', async () => {
    // Do T-127 kratka pokazywala BAZE (200 zl), a wyliczonej kwoty nie bylo
    // w edycji wcale — nie dalo sie zrozumiec, skad suma sekcji.
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={parametryczna}
          editing
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={onPatch}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );

    const pole = screen.getByLabelText(pl.editor.itemPriceLabel);
    expect(pole).toHaveValue('245,00 zł');
    await user.clear(pole);
    await user.type(pole, '500');
    await user.tab();

    expect(onPatch).toHaveBeenCalledWith(parametryczna.id, {
      priceOverrideCents: 50_000,
      unitPriceCents: 0,
    });
    // Reguly NIE ruszamy — „przywroc z cennika" ma do czego wrocic.
    expect(onPatch.mock.calls[0]![1]).not.toHaveProperty('pricing');
  });

  it('nadpisana pozycja mowi „recznie", a wyczyszczenie kratki zdejmuje nadpisanie', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const nadpisana = { ...parametryczna, priceOverrideCents: 99_900 };
    render(
      <Dnd ids={[nadpisana.id]}>
        <ItemRow
          item={nadpisana}
          editing
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={onPatch}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );

    expect(screen.getByLabelText(pl.editor.itemPriceLabel)).toHaveValue('999,00 zł');
    expect(screen.getByText(pl.editor.pricingOverridden)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(pl.editor.itemPriceLabel));
    await user.tab();
    expect(onPatch).toHaveBeenCalledWith(nadpisana.id, { priceOverrideCents: null });
  });

  it('parametryczna bez ceny jest „indywidualna" — pole puste, a nie liczone ze stawek', () => {
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={{ ...parametryczna, unitPriceCents: null }}
          editing
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );
    expect(screen.getByLabelText(pl.editor.itemPriceLabel)).toHaveValue('');
    expect(screen.queryByText(/pom\./)).not.toBeInTheDocument();
  });

  it('w bloku pomieszczenia pisze „kuchnia ×2: 2 × stawka" i liczy tylko to pomieszczenie', () => {
    const kuchnia = rooms[0]!;
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={{ ...parametryczna, roomId: kuchnia.id }}
          editing={false}
          currency="PLN"
          rooms={rooms}
          blockRoomId={kuchnia.id}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );
    // 2 × 15 zl, BEZ bazy 200 zl.
    expect(screen.getByText(/30,00/)).toBeInTheDocument();
    expect(screen.getByText(/Kuchnia ×2: 2 × 15,00/)).toBeInTheDocument();
  });

  it('nieprzypieta pozycja w bloku (sprzed T-126) jest oznaczona i da sie przypiac', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const kuchnia = rooms[0]!;
    render(
      <Dnd ids={[parametryczna.id]}>
        <ItemRow
          item={parametryczna}
          editing
          currency="PLN"
          rooms={rooms}
          blockRoomId={kuchnia.id}
          onToggle={vi.fn()}
          onPatch={onPatch}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );
    await user.click(screen.getByRole('button', { name: new RegExp(pl.editor.pricingUnpinned) }));
    expect(onPatch).toHaveBeenCalledWith(parametryczna.id, { roomId: kuchnia.id });
  });

  it('pozycja bez ceny ma w edycji PUSTE pole z podpowiedzia, a wpisanie nadaje cene', async () => {
    const user = userEvent.setup();
    const { item, onPatch } = setup({ unitPriceCents: null }, true);

    const pole = screen.getByLabelText(pl.editor.itemPriceLabel);
    expect(pole).toHaveValue('');
    expect(pole).toHaveAttribute('placeholder', pl.editor.individualPrice);

    await user.type(pole, '1200');
    await user.tab();
    expect(onPatch).toHaveBeenCalledWith(item.id, { unitPriceCents: 120_000 });
  });

  it('wyczyszczenie pola ceny wraca do wyceny indywidualnej', async () => {
    const user = userEvent.setup();
    const { item, onPatch } = setup({ unitPriceCents: 25_000 }, true);

    await user.clear(screen.getByLabelText(pl.editor.itemPriceLabel));
    await user.tab();
    expect(onPatch).toHaveBeenCalledWith(item.id, { unitPriceCents: null });
  });

  it('zwykla pozycja dalej ma pole ceny i zaden dopisek', () => {
    const zwykla = newItem({ name: 'Nadzor', unitPriceCents: 25_000 });
    render(
      <Dnd ids={[zwykla.id]}>
        <ItemRow
          item={zwykla}
          editing
          currency="PLN"
          rooms={rooms}
          onToggle={vi.fn()}
          onPatch={vi.fn()}
          onRemove={vi.fn()}
          {...BEZ_WARIANTOW}
        />
      </Dnd>,
    );

    expect(screen.getByLabelText(pl.editor.itemPriceLabel)).toBeInTheDocument();
    expect(screen.queryByText(/pom\./)).not.toBeInTheDocument();
  });
});
