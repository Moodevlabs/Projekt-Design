import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemRow } from './ItemRow';
import { ItemsColumnsHeader } from './ItemsColumnsHeader';
import { COL_ACTIONS, COL_PRICE, COL_QTY } from './item-columns';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS, newItem } from '@/domain/quote';
import { pl } from '@/i18n/pl';

function Dnd({ ids, children }: { ids: string[]; children: ReactNode }) {
  return (
    <DndContext>
      <SortableContext items={ids}>{children}</SortableContext>
    </DndContext>
  );
}

function renderRowWithHeader() {
  const item = newItem({ name: 'Blat kuchenny', unitPriceCents: 120_000 });
  return render(
    <Dnd ids={[item.id]}>
      <ItemsColumnsHeader />
      <ItemRow
        item={item}
        editing
        currency="PLN"
        rooms={[]}
        variants={NO_VARIANTS}
        onVariantChange={vi.fn()}
        textInfo={{ rooms: [], client: '' }}
        pricing={AMOUNT_BASIS}
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
      />
    </Dnd>,
  );
}

/** Pierwsza klasa stałej — `w-14` z `'w-14 shrink-0'`. */
const width = (token: string) => token.split(' ')[0]!;

/**
 * Regresja na rozjazd, który zgłosił właściciel: podpisy „Ilość" i „Cena"
 * wisiały o **68 px** w lewo od pól, które opisują.
 *
 * Powód: nagłówek i wiersz miały szerokości przepisane osobno. Nagłówek
 * rezerwował z prawej 94 px na TRZY przyciski, a wiersz ma jeden — dwa zdjęto
 * przy poprawce 7 (2026-08-27). Kolumna nazwy jest elastyczna, więc całą
 * różnicę brała na siebie i przesuwała wszystko za sobą.
 *
 * jsdom nie liczy układu, więc nie zmierzymy pikseli. Mierzymy to, co jest
 * teraz prawdziwym niezmiennikiem: obie strony biorą szerokości z tego samego
 * pliku. Ktoś, kto wpisze liczbę na sztywno, wywali ten test.
 */
describe('nagłówek kolumn i wiersz pozycji trzymają wspólne szerokości', () => {
  it('kolumna ilości ma tę samą szerokość w nagłówku i w polu', () => {
    renderRowWithHeader();

    const naglowek = screen.getByText(pl.editor.itemsColQty);
    const pole = screen.getByLabelText(pl.editor.itemQtyLabel);

    expect(naglowek.className).toContain(width(COL_QTY));
    expect(pole.className).toContain(width(COL_QTY));
  });

  it('kolumna ceny ma tę samą szerokość w nagłówku i w strefie kwoty', () => {
    const { container } = renderRowWithHeader();

    const naglowek = screen.getByText(pl.editor.itemsColPrice);
    expect(naglowek.className).toContain(width(COL_PRICE));

    // Strefa kwoty nie ma etykiety — szukamy jej po tej samej klasie.
    expect(container.querySelectorAll(`[class*="${width(COL_PRICE)}"]`).length).toBeGreaterThan(1);
  });

  it('nagłówek rezerwuje z prawej dokładnie jeden przycisk, bo tyle ich jest', () => {
    const { container } = renderRowWithHeader();

    const kosz = screen.getByRole('button', { name: /Usuń pozycję/i });
    expect(kosz.className).toContain(width(COL_ACTIONS));

    // Jeden przycisk kosza w wierszu — gdyby wrócił drugi, `COL_ACTIONS`
    // trzeba zmienić w JEDNYM miejscu, a nie w dwóch.
    expect(container.querySelectorAll('[data-testid="item-row"] button[aria-label^="Usuń"]')).toHaveLength(1);
  });
});
