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
    pricing: { mode: 'flat' },
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

  /**
   * Regresja: `AddLink` zjadał propsy od `PopoverTrigger asChild` (brał tylko
   * `icon`/`children`/`onClick`), więc Radix nie dostawał ani ref-a, ani
   * kontroli nad triggerem. Popover otwierał się na stanie, ale bez kotwicy —
   * w przeglądarce kliknięcie „Z biblioteki" nie dawało nic. W jsdom tego nie
   * widać po samym tekście, dlatego sprawdzamy atrybuty stanu Radiksa.
   */
  it('trigger jest sterowany przez Radiksa, a nie lokalnym stanem', async () => {
    const user = userEvent.setup();
    render(<LibraryPicker onPickItem={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: pl.editor.fromLibrary });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('data-state', 'closed');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('data-state', 'open');

    // Drugie kliknięcie musi zamykać — własny `onClick` ustawiający `true`
    // wygrywałby z toggle'em i popover zostawałby otwarty na zawsze.
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('wstawia zestaw jako grupę wyceny z jej pozycjami', async () => {
    const user = userEvent.setup();
    const onPickGroup = vi.fn();
    useLibraryGroups.mockReturnValue({
      data: [
        {
          id: 'g1',
          workspaceId: 'ws',
          name: 'Kuchnia',
          sortOrder: 0,
          items: [
            {
              name: 'Projekt koncepcyjny',
              description: '',
              kind: 'item',
              qty: 14,
              unitPriceCents: 9_000,
              libraryItemId: null,
            },
          ],
        },
      ],
    });
    render(<LibraryPicker onPickItem={vi.fn()} onPickGroup={onPickGroup} />);

    await user.click(screen.getByRole('button', { name: pl.editor.fromLibrary }));
    await user.click(screen.getByRole('button', { name: pl.editor.pickerGroupsTab }));
    await user.click(await screen.findByText('Kuchnia'));

    expect(onPickGroup).toHaveBeenCalledTimes(1);
    const grupa = onPickGroup.mock.calls[0]?.[0] as { name: string; items: { qty: number }[] };
    expect(grupa.name).toBe('Kuchnia');
    // Ilość ma przyjechać z zestawu, nie zostać zresetowana do 1.
    expect(grupa.items[0]?.qty).toBe(14);
  });

  it('bez obsługi grup nie pokazuje zakładek', async () => {
    const user = userEvent.setup();
    render(<LibraryPicker onPickItem={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: pl.editor.fromLibrary }));
    expect(screen.queryByRole('button', { name: pl.editor.pickerGroupsTab })).not.toBeInTheDocument();
  });
});
