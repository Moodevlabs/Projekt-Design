import type { ReactNode } from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItemRow } from './ItemRow';
import { NO_VARIANTS } from '../useVariantOptions';
import { AMOUNT_BASIS, newItem, type DocumentTextInfo, type Room } from '@/domain/quote';
import { pl } from '@/i18n/pl';

function Dnd({ ids, children }: { ids: string[]; children: ReactNode }) {
  return (
    <DndContext>
      <SortableContext items={ids}>{children}</SortableContext>
    </DndContext>
  );
}

const KUCHNIA: Room = {
  id: 'r-kuchnia',
  label: 'kuchnia',
  roomTypeId: null,
  qty: 1,
  includedInVisual: true,
  includedInTechnical: true,
};

const SALON: Room = { ...KUCHNIA, id: 'r-salon', label: 'salon', qty: 2 };

const TEXT_INFO: DocumentTextInfo = { rooms: [KUCHNIA, SALON], client: 'Jan Kowalski' };

const OPIS = 'Widoki ścian dla: {rooms}.';

function renderRow(editing: boolean, description = OPIS) {
  const item = newItem({ name: 'Projekt wykonawczy', description });
  render(
    <Dnd ids={[item.id]}>
      <ItemRow
        item={item}
        editing={editing}
        currency="PLN"
        rooms={TEXT_INFO.rooms}
        textInfo={TEXT_INFO}
        pricing={AMOUNT_BASIS}
        variants={NO_VARIANTS}
        onVariantChange={vi.fn()}
        onToggle={vi.fn()}
        onPatch={vi.fn()}
        onRemove={vi.fn()}
        onSaveToLibrary={vi.fn()}
      />
    </Dnd>,
  );
  return item;
}

describe('placeholdery w wierszu pozycji', () => {
  it('w EDYCJI pokazuje surowy tekst', () => {
    // Inaczej nie dałoby się poprawić placeholdera — użytkownik widziałby
    // wynik podstawienia i nie miał czego kliknąć.
    renderRow(true);
    expect(screen.getByLabelText(pl.editor.itemDescriptionLabel)).toHaveValue(OPIS);
  });

  it('w PODGLĄDZIE pokazuje podstawiony tekst', () => {
    renderRow(false);
    expect(screen.getByText('Widoki ścian dla: kuchnia, salon x2.')).toBeInTheDocument();
    expect(screen.queryByText(OPIS)).not.toBeInTheDocument();
  });

  it('nieznany placeholder zostaje widoczny także w podglądzie', () => {
    // Literówka ma być widoczna, a nie zamieniać się w dziurę w zdaniu.
    renderRow(false, 'Zakres: {pokoje}.');
    expect(screen.getByText('Zakres: {pokoje}.')).toBeInTheDocument();
  });

  it('opis bez placeholderów wygląda tak samo w obu trybach', () => {
    const zwykly = 'Rysunki techniczne i detale.';
    const { unmount } = render(<div />);
    unmount();

    renderRow(false, zwykly);
    expect(screen.getByText(zwykly)).toBeInTheDocument();
  });
});
