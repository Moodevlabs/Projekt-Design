import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomType } from '@/data/repos/room-types.repo';
import { pl } from '@/i18n/pl';

const useRoomTypes = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateRoomMutate = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes,
  useCreateRoomType: () => ({ mutate: createMutate, isPending: false }),
  useUpdateRoomType: () => ({ mutate: updateRoomMutate, isPending: false }),
  useDeleteRoomType: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn() },
}));

const { RoomTypesSection } = await import('./RoomTypesSection');

function roomType(name: string, slug: string, sortOrder = 0): RoomType {
  return { id: `rt-${slug}`, workspaceId: 'ws-1', name, slug, sortOrder };
}

beforeEach(() => {
  vi.clearAllMocks();
  useRoomTypes.mockReturnValue({ isLoading: false, data: [roomType('Kuchnia', 'kuchnia')] });
});

/**
 * Sekcja od T-73 zyje wylacznie w Bibliotece → Pomieszczenia; testy przyjechaly
 * z `SettingsPage.test`, gdzie byly, gdy sekcja stala w Ustawieniach.
 */
describe('Typy pomieszczen', () => {
  it('dodaje nowy typ na koniec listy, nie na poczatek', async () => {
    // Kolejnosc typow jest decyzja uzytkownika (odpowiada ukladowi w ofercie),
    // a nie alfabetu — nowy wpis nie ma prawa wskoczyc przed istniejace.
    useRoomTypes.mockReturnValue({
      isLoading: false,
      data: [roomType('Kuchnia', 'kuchnia', 1), roomType('Salon', 'salon', 5)],
    });
    const user = userEvent.setup();
    render(<RoomTypesSection canWrite />);

    await user.type(screen.getByPlaceholderText(pl.settings.roomTypeNamePlaceholder), 'Łazienka');
    await user.click(screen.getByRole('button', { name: pl.common.add }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({ name: 'Łazienka', sortOrder: 6 });
  });

  it('nie pozwala dodac typu, ktory dalby ten sam klucz', async () => {
    // „Kuchnia” i „kuchnia ” daja ten sam slug — bez tego wpadlyby na unikalny
    // indeks w bazie i uzytkownik dostalby surowy blad Postgresa.
    const user = userEvent.setup();
    render(<RoomTypesSection canWrite />);

    await user.type(screen.getByPlaceholderText(pl.settings.roomTypeNamePlaceholder), 'kuchnia');
    await user.click(screen.getByRole('button', { name: pl.common.add }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(pl.settings.roomTypeDuplicate);
  });

  it('zmiana nazwy NIE zmienia klucza', async () => {
    // Slug jest kluczem technicznym cennika parametrycznego. Gdyby szedl za
    // nazwa, poprawka literowki wyzerowalaby ceny w zapisanych wycenach.
    const user = userEvent.setup();
    render(<RoomTypesSection canWrite />);

    const pole = screen.getByLabelText(pl.settings.roomTypeName('Kuchnia'));
    await user.clear(pole);
    await user.type(pole, 'Kuchnia otwarta');
    await user.tab();

    expect(updateRoomMutate).toHaveBeenCalledTimes(1);
    const [args] = updateRoomMutate.mock.calls[0] as [
      { id: string; patch: Record<string, unknown> },
    ];
    expect(args.patch).toEqual({ name: 'Kuchnia otwarta' });
    expect(args.patch).not.toHaveProperty('slug');
  });

  it('pokazuje klucz obok nazwy', () => {
    render(<RoomTypesSection canWrite />);
    const wiersz = screen.getByLabelText(pl.settings.roomTypeName('Kuchnia')).closest('li');
    expect(within(wiersz as HTMLElement).getByText('kuchnia')).toBeInTheDocument();
  });

  it('pusta lista mowi wprost, ze nie ma typow', () => {
    useRoomTypes.mockReturnValue({ isLoading: false, data: [] });
    render(<RoomTypesSection canWrite />);
    expect(screen.getByText(pl.settings.roomTypesEmpty)).toBeInTheDocument();
  });

  it('nie pokazuje dodawania bez prawa zapisu', () => {
    render(<RoomTypesSection canWrite={false} />);
    expect(screen.queryByRole('button', { name: pl.common.add })).not.toBeInTheDocument();
  });
});
