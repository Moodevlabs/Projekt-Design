import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pl } from '@/i18n/pl';

const useLibraryItems = vi.hoisted(() => vi.fn());
const useLibraryGroups = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useLibrary', () => ({ useLibraryItems, useLibraryGroups }));

const { LibraryPicker } = await import('./LibraryPicker');
const { byCategory } = await import('./group-library-items');

function item(partial: Partial<LibraryItem> & { id: string; name: string }): LibraryItem {
  return {
    workspaceId: 'ws',
    category: 'Inne',
    kind: 'item',
    description: '',
    unitPriceCents: 10_000,
    sortOrder: 0,
    ...partial,
  };
}

describe('byCategory', () => {
  const items = [
    item({ id: '1', name: 'Nadzór', category: 'Nadzór' }),
    item({ id: '2', name: 'Blat', category: 'Kuchnia' }),
    item({ id: '3', name: 'Projekt', category: 'Projekt' }),
  ];

  it('grupuje i sortuje kategorie alfabetycznie po polsku', () => {
    expect(byCategory(items).map(([nazwa]) => nazwa)).toEqual(['Kuchnia', 'Nadzór', 'Projekt']);
  });

  it('wypycha na górę kategorię pasującą do kontekstu', () => {
    // Wstawiając pozycję do grupy „Kuchnia" najczęściej szuka się kuchennych.
    expect(byCategory(items, 'Kuchnia')[0]?.[0]).toBe('Kuchnia');
    expect(byCategory(items, 'nadzór')[0]?.[0]).toBe('Nadzór');
  });

  it('nieznany kontekst nie psuje sortowania', () => {
    expect(byCategory(items, 'Łazienka').map(([nazwa]) => nazwa)).toEqual([
      'Kuchnia',
      'Nadzór',
      'Projekt',
    ]);
  });
});

describe('LibraryPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLibraryItems.mockReturnValue({
      data: [item({ id: 'l1', name: 'Blat kuchenny', category: 'Kuchnia', unitPriceCents: 120_000 })],
    });
    useLibraryGroups.mockReturnValue({ data: [] });
  });

  it('wstawia wybraną pozycję jako pozycję wyceny powiązaną z biblioteką', async () => {
    const user = userEvent.setup();
    const onPickItem = vi.fn();
    render(<LibraryPicker onPickItem={onPickItem} />);

    await user.click(screen.getByRole('button', { name: pl.editor.fromLibrary }));
    await user.click(await screen.findByText('Blat kuchenny'));

    expect(onPickItem).toHaveBeenCalledTimes(1);
    const wstawiona = onPickItem.mock.calls[0]?.[0] as { libraryItemId: string; unitPriceCents: number };
    // `libraryItemId` jest tym, co później pozwala kaskadować zmiany z biblioteki.
    expect(wstawiona.libraryItemId).toBe('l1');
    expect(wstawiona.unitPriceCents).toBe(120_000);
  });

  it('bez obsługi grup nie pokazuje zakładek', async () => {
    const user = userEvent.setup();
    render(<LibraryPicker onPickItem={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: pl.editor.fromLibrary }));
    expect(screen.queryByRole('button', { name: pl.editor.pickerGroupsTab })).not.toBeInTheDocument();
  });
});
