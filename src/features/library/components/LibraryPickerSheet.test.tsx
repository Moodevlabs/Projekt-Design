import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LibraryPickerSheet, type LibraryPickerRow } from './LibraryPickerSheet';
import { pl } from '@/i18n/pl';

const ROWS: LibraryPickerRow[] = [
  { id: 'a', title: 'Inwentaryzacja', subtitle: 'Pomiar z natury', meta: '500,00 zł' },
  { id: 'b', title: 'Wizualizacje 3D', subtitle: 'Trzy ujęcia', meta: '1 350,00 zł' },
];

function setup(rows: LibraryPickerRow[] = ROWS) {
  const onAdd = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <LibraryPickerSheet
      open
      onOpenChange={onOpenChange}
      title="Dodaj pozycję"
      description="Opis panelu"
      rows={rows}
      emptyLabel="Biblioteka jest pusta"
      noMatchLabel="Brak dopasowań"
      addLabel={(name) => `Dodaj: ${name}`}
      onAdd={onAdd}
    />,
  );
  return { onAdd, onOpenChange };
}

/**
 * T-123: cztery różne popovery po 280–320 px zastąpił jeden panel z prawej,
 * ten sam, którym dobiera się usługi do wyceny. Zasady przeniesione z
 * `ScopePanel`: klik dodaje od razu, panel ZOSTAJE otwarty, licznik pokazuje,
 * co już weszło.
 */
describe('LibraryPickerSheet', () => {
  it('dodanie nie zamyka panelu — prawie nigdy nie dobiera się jednej rzeczy', async () => {
    const user = userEvent.setup();
    const { onAdd, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Dodaj: Inwentaryzacja' }));

    expect(onAdd).toHaveBeenCalledWith('a');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Dodaj: Wizualizacje 3D' })).toBeInTheDocument();
  });

  it('liczy, ile już dodano — także tę samą pozycję dwa razy', async () => {
    const user = userEvent.setup();
    const { onAdd } = setup();

    await user.click(screen.getByRole('button', { name: 'Dodaj: Inwentaryzacja' }));
    await user.click(screen.getByRole('button', { name: 'Dodaj: Inwentaryzacja' }));

    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(screen.getByText(pl.library.picker.addedTotal(2))).toBeInTheDocument();
    expect(screen.getByText('×2')).toBeInTheDocument();
  });

  it('szuka po nazwie, opisie i kolumnie z prawej', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(pl.library.picker.search), 'ujęcia');

    expect(screen.getByText('Wizualizacje 3D')).toBeInTheDocument();
    expect(screen.queryByText('Inwentaryzacja')).not.toBeInTheDocument();
  });

  /** Dwa różne stany pustki: nie ma czego wybierać vs. szukanie nic nie dało. */
  it('rozróżnia pustą bibliotekę od braku dopasowań', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText(pl.library.picker.search), 'zzz');
    expect(screen.getByText('Brak dopasowań')).toBeInTheDocument();
    expect(screen.queryByText('Biblioteka jest pusta')).not.toBeInTheDocument();
  });

  it('pusta lista mówi to inaczej niż nieudane szukanie', () => {
    setup([]);

    expect(screen.getByText('Biblioteka jest pusta')).toBeInTheDocument();
  });

  it('„Gotowe" zamyka panel', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: pl.library.picker.done }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
