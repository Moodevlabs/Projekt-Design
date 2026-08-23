import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultWorkspaceSettings, type WorkspaceSettings } from '@/domain/brand/schema';
import { DEFAULT_NUMBER_PATTERN } from '@/domain/numbering';
import type { RoomType } from '@/data/repos/room-types.repo';
import { pl } from '@/i18n/pl';

const useWorkspace = vi.hoisted(() => vi.fn());
const updateMutate = vi.hoisted(() => vi.fn());
const useRoomTypes = vi.hoisted(() => vi.fn());
const createMutate = vi.hoisted(() => vi.fn());
const updateRoomMutate = vi.hoisted(() => vi.fn());
const canWrite = vi.hoisted(() => ({ value: true }));
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/queries/useWorkspace', () => ({
  useWorkspace,
  useWorkspaceId: () => 'ws-1',
  useUpdateWorkspaceSettings: () => ({ mutate: updateMutate, isPending: false }),
  requireWorkspaceId: (id?: string) => id ?? 'ws-1',
}));

vi.mock('@/data/queries/useRoomTypes', () => ({
  useRoomTypes,
  useCreateRoomType: () => ({ mutate: createMutate, isPending: false }),
  useUpdateRoomType: () => ({ mutate: updateRoomMutate, isPending: false }),
  useDeleteRoomType: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: canWrite.value, reason: 'active', loading: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn() },
}));

vi.mock('./AccountSection', () => ({
  // Sekcja konta ma wlasny ciezar (formularz hasla, Supabase) — tutaj testujemy
  // ustawienia dokumentu i typy pomieszczen.
  AccountSection: () => null,
}));

const { SettingsPage } = await import('./SettingsPage');

function roomType(name: string, slug: string, sortOrder = 0): RoomType {
  return { id: `rt-${slug}`, workspaceId: 'ws-1', name, slug, sortOrder };
}

function mockWorkspace(settings: Partial<WorkspaceSettings> = {}) {
  useWorkspace.mockReturnValue({
    isPending: false,
    isError: false,
    data: {
      id: 'ws-1',
      name: 'Firma',
      ownerId: 'u1',
      settings: { ...defaultWorkspaceSettings(), ...settings },
      quoteSeq: 3,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  canWrite.value = true;
  mockWorkspace();
  useRoomTypes.mockReturnValue({ isLoading: false, data: [roomType('Kuchnia', 'kuchnia')] });
});

describe('Ustawienia wycen', () => {
  it('pokazuje na zywo, jak zadziala wzorzec numeracji', () => {
    // Wzorzec to skladnia z tokenami. Bez podgladu czlowiek dowiedzialby sie,
    // co wpisal, dopiero przy nastepnej wycenie — a wtedy numer jest nadany.
    render(<SettingsPage />);

    const pole = screen.getByLabelText(pl.settings.numberPattern);
    // `fireEvent`, nie `user.type` — w składni userEvent `{` otwiera opis
    // klawisza, a tokeny wzorca to dokładnie klamry.
    fireEvent.change(pole, { target: { value: 'OF-{YY}/{seq:3}' } });

    const rok = String(new Date().getFullYear()).slice(-2);
    expect(screen.getByText(`OF-${rok}/042`)).toBeInTheDocument();
  });

  it('zapis jest nieaktywny, dopoki nic nie zmieniono', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const zapisz = screen.getByRole('button', { name: pl.common.save });
    expect(zapisz).toBeDisabled();

    await user.type(screen.getByLabelText(pl.settings.numberPattern), 'X');
    expect(zapisz).toBeEnabled();
  });

  it('nie zapisuje stawki VAT spoza zakresu', async () => {
    // 150% VAT-u to nie jest literowka, ktora ma trafic do dokumentu.
    const user = userEvent.setup();
    render(<SettingsPage />);

    const vat = screen.getByLabelText(pl.settings.vatRate);
    await user.clear(vat);
    await user.type(vat, '150');

    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('zapisuje zmieniony komplet ustawien', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    const vat = screen.getByLabelText(pl.settings.vatRate);
    await user.clear(vat);
    await user.type(vat, '8');
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0]?.[0]).toMatchObject({
      vatRate: 8,
      numberPattern: DEFAULT_NUMBER_PATTERN,
    });
  });

  it('przywracanie domyslnego wzorca pokazuje sie tylko, gdy jest co przywracac', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SettingsPage />);
    expect(
      screen.queryByRole('button', { name: pl.settings.numberPatternReset }),
    ).not.toBeInTheDocument();
    unmount();

    mockWorkspace({ numberPattern: 'OF/{seq}' });
    render(<SettingsPage />);
    await user.click(screen.getByRole('button', { name: pl.settings.numberPatternReset }));

    expect(screen.getByLabelText(pl.settings.numberPattern)).toHaveValue(DEFAULT_NUMBER_PATTERN);
  });
});

describe('Ustawienia a wygasly dostep', () => {
  it('blokuje edycje ustawien, ale mowi, ze eksport dziala', () => {
    canWrite.value = false;
    render(<SettingsPage />);

    expect(screen.getByText(pl.settings.readOnly)).toBeInTheDocument();
    expect(screen.getByLabelText(pl.settings.numberPattern)).toBeDisabled();
    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
  });

  it('nie pokazuje dodawania typow pomieszczen bez prawa zapisu', () => {
    canWrite.value = false;
    render(<SettingsPage />);

    expect(screen.queryByRole('button', { name: pl.common.add })).not.toBeInTheDocument();
  });
});

describe('Typy pomieszczen', () => {
  it('dodaje nowy typ na koniec listy, nie na poczatek', async () => {
    // Kolejnosc typow jest decyzja uzytkownika (odpowiada ukladowi w ofercie),
    // a nie alfabetu — nowy wpis nie ma prawa wskoczyc przed istniejace.
    useRoomTypes.mockReturnValue({
      isLoading: false,
      data: [roomType('Kuchnia', 'kuchnia', 1), roomType('Salon', 'salon', 5)],
    });
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText(pl.settings.roomTypeNamePlaceholder), 'Łazienka');
    await user.click(screen.getByRole('button', { name: pl.common.add }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0]?.[0]).toMatchObject({ name: 'Łazienka', sortOrder: 6 });
  });

  it('nie pozwala dodac typu, ktory dalby ten sam klucz', async () => {
    // „Kuchnia” i „kuchnia ” daja ten sam slug — bez tego wpadlyby na unikalny
    // indeks w bazie i uzytkownik dostalby surowy blad Postgresa.
    const user = userEvent.setup();
    render(<SettingsPage />);

    await user.type(screen.getByPlaceholderText(pl.settings.roomTypeNamePlaceholder), 'kuchnia');
    await user.click(screen.getByRole('button', { name: pl.common.add }));

    expect(createMutate).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(pl.settings.roomTypeDuplicate);
  });

  it('zmiana nazwy NIE zmienia klucza', async () => {
    // Slug jest kluczem technicznym cennika parametrycznego. Gdyby szedl za
    // nazwa, poprawka literowki wyzerowalaby ceny w zapisanych wycenach.
    const user = userEvent.setup();
    render(<SettingsPage />);

    const pole = screen.getByLabelText(pl.settings.roomTypeName('Kuchnia'));
    await user.clear(pole);
    await user.type(pole, 'Kuchnia otwarta');
    await user.tab();

    expect(updateRoomMutate).toHaveBeenCalledTimes(1);
    const [args] = updateRoomMutate.mock.calls[0] as [{ id: string; patch: Record<string, unknown> }];
    expect(args.patch).toEqual({ name: 'Kuchnia otwarta' });
    expect(args.patch).not.toHaveProperty('slug');
  });

  it('pokazuje klucz obok nazwy', () => {
    render(<SettingsPage />);
    const wiersz = screen.getByLabelText(pl.settings.roomTypeName('Kuchnia')).closest('li');
    expect(within(wiersz as HTMLElement).getByText('kuchnia')).toBeInTheDocument();
  });

  it('pusta lista mowi wprost, ze nie ma typow', () => {
    useRoomTypes.mockReturnValue({ isLoading: false, data: [] });
    render(<SettingsPage />);
    expect(screen.getByText(pl.settings.roomTypesEmpty)).toBeInTheDocument();
  });
});
