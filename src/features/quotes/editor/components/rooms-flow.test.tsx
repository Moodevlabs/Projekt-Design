import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomsPanel } from './RoomsPanel';
import { useEditorStore } from '../editor.store';
import { newQuoteBody, newSection } from '@/domain/quote';
import type { RoomType } from '@/data/repos/room-types.repo';
import { pl } from '@/i18n/pl';

const useRoomTypes = vi.hoisted(() => vi.fn());
vi.mock('@/data/queries/useRoomTypes', () => ({ useRoomTypes }));

const TYPY: RoomType[] = [
  { id: 'rt-kuchnia', workspaceId: 'ws', name: 'Kuchnia', slug: 'kuchnia', sortOrder: 10 },
  { id: 'rt-salon', workspaceId: 'ws', name: 'Salon', slug: 'salon', sortOrder: 20 },
];

/** Panel podłączony do prawdziwego store'u — tak jak w edytorze. */
function PanelNaStorze() {
  const rooms = useEditorStore((state) => state.body?.rooms ?? []);
  const addRoom = useEditorStore((state) => state.addRoom);
  const updateRoom = useEditorStore((state) => state.updateRoom);
  const removeRoom = useEditorStore((state) => state.removeRoom);

  return (
    <RoomsPanel
      rooms={rooms}
      editing
      onAdd={addRoom}
      onPatch={updateRoom}
      onRemove={removeRoom}
    />
  );
}

function pomieszczenia() {
  return useEditorStore.getState().body?.rooms ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  useRoomTypes.mockReturnValue({ data: TYPY });
  useEditorStore.getState().reset();
  useEditorStore.setState({
    body: newQuoteBody({ sections: [newSection({ title: 'Projekt' })] }),
    quoteId: 'q1',
    lastSeenUpdatedAt: '2026-08-01T10:00:00Z',
    saveState: 'idle',
  });
});

describe('dodawanie pomieszczenia', () => {
  it('WYBÓR TYPU nazywa pomieszczenie', async () => {
    /*
     * Zgłoszenie: „wybieram pomieszczenie, a jak klikam rozpisz na
     * pomieszczenia, to dodaje »Nowe pomieszczenie«". Wybór typu ustawiał
     * tylko `roomTypeId` i nie ruszał nazwy, a blok w sekcji czyta wlasnie
     * nazwe pomieszczenia.
     */
    const user = userEvent.setup();
    render(<PanelNaStorze />);

    await user.click(screen.getByRole('button', { name: pl.editor.addRoom }));
    expect(pomieszczenia()[0]?.label).toBe('Nowe pomieszczenie');

    const select = screen.getByLabelText(pl.editor.roomTypeLabel('Nowe pomieszczenie'));
    await user.selectOptions(select, 'rt-kuchnia');

    expect(pomieszczenia()[0]?.label).toBe('Kuchnia');
    expect(pomieszczenia()[0]?.roomTypeId).toBe('rt-kuchnia');
  });

  it('zmiana typu przemianowuje, dopóki nazwa jest automatyczna', async () => {
    const user = userEvent.setup();
    render(<PanelNaStorze />);
    await user.click(screen.getByRole('button', { name: pl.editor.addRoom }));

    await user.selectOptions(
      screen.getByLabelText(pl.editor.roomTypeLabel('Nowe pomieszczenie')),
      'rt-kuchnia',
    );
    await user.selectOptions(screen.getByLabelText(pl.editor.roomTypeLabel('Kuchnia')), 'rt-salon');

    expect(pomieszczenia()[0]?.label).toBe('Salon');
  });

  it('NIE nadpisuje nazwy wpisanej ręcznie', async () => {
    const user = userEvent.setup();
    render(<PanelNaStorze />);
    await user.click(screen.getByRole('button', { name: pl.editor.addRoom }));

    const nazwa = screen.getByLabelText(pl.editor.roomNameLabel('Nowe pomieszczenie'));
    await user.clear(nazwa);
    await user.type(nazwa, 'Kuchnia z jadalnią');
    await user.tab();

    await user.selectOptions(
      screen.getByLabelText(pl.editor.roomTypeLabel('Kuchnia z jadalnią')),
      'rt-kuchnia',
    );

    expect(pomieszczenia()[0]?.label).toBe('Kuchnia z jadalnią');
    expect(pomieszczenia()[0]?.roomTypeId).toBe('rt-kuchnia');
  });

  it('nazwę da się zmienić także po wybraniu typu', async () => {
    // Uzytkownik pisal, ze „nie da sie tego ani zmienic ani nic".
    const user = userEvent.setup();
    render(<PanelNaStorze />);
    await user.click(screen.getByRole('button', { name: pl.editor.addRoom }));
    await user.selectOptions(
      screen.getByLabelText(pl.editor.roomTypeLabel('Nowe pomieszczenie')),
      'rt-kuchnia',
    );

    const nazwa = screen.getByLabelText(pl.editor.roomNameLabel('Kuchnia'));
    await user.clear(nazwa);
    await user.type(nazwa, 'Aneks kuchenny');
    await user.tab();

    expect(pomieszczenia()[0]?.label).toBe('Aneks kuchenny');
  });
});

/*
 * Blok „rozpisanie sekcji na pomieszczenia" zniknal razem z akcja
 * `addRoomBlocks` (poprawka 7, 2026-08-27). Zasada, ktorej pilnowal — naglowek
 * bloku czyta nazwe pomieszczenia NA ZYWO, wiec zmiana typu przechodzi na blok
 * — obowiazuje dalej i sprawdza ja `GroupBlock.test`.
 */
