import { fireEvent, render, screen } from '@testing-library/react';
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
const testMutate = vi.hoisted(() => vi.fn());
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

// Sekcja „Pliki" (T-55) pyta o zuzycie miejsca — ustawienia testuja sie bez niej.
// Sekcja „Biblioteka przykladowa" (T-62) pyta, ile wpisow zostalo.
vi.mock('@/data/queries/useLibrary', () => ({
  useSampleCount: () => ({ data: 0, isLoading: false }),
  useDeleteSampleLibrary: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/data/queries/useFiles', () => ({
  useStorageUsage: () => ({ data: { usedBytes: 0, quotaBytes: 2147483648 }, isLoading: false }),
  // Kosz (T-67). Pusty, wiec sekcja i tak sie nie renderuje — ale hooki
  // musza istniec, bo StorageUsageSection pyta o kosz (dopisek o zajetosci).
  useTrash: () => ({ data: [], isLoading: false }),
  useRestoreFile: () => ({ mutate: vi.fn() }),
  useDeleteFilePermanently: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  usePurgeExpiredTrash: () => ({ data: 0 }),
}));

// Powiadomienia e-mail (T-116). Sekcja wola funkcje brzegowa przez
// `useMutation`, wiec bez tej atrapy strona wymagalaby QueryClientProvider —
// a caly ten plik testuje ja bez niego, na zamockowanych hookach.
vi.mock('@/data/queries/useNotifications', () => ({
  useSendTestNotification: () => ({ mutate: testMutate, isPending: false }),
}));

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({ session: { user: { email: 'projektant@przyklad.pl' } } }),
}));

vi.mock('@/features/billing/useEntitlement', () => ({
  useEntitlement: () => ({ canWrite: canWrite.value, reason: 'active', loading: false }),
}));

vi.mock('sonner', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn() },
}));

const { SettingsAppPage } = await import('./SettingsAppPage');

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

describe('Ustawienia → Aplikacja: wyceny', () => {
  it('pokazuje na zywo, jak zadziala wzorzec numeracji', () => {
    // Wzorzec to skladnia z tokenami. Bez podgladu czlowiek dowiedzialby sie,
    // co wpisal, dopiero przy nastepnej wycenie — a wtedy numer jest nadany.
    render(<SettingsAppPage />);

    const pole = screen.getByLabelText(pl.settings.numberPattern);
    // `fireEvent`, nie `user.type` — w składni userEvent `{` otwiera opis
    // klawisza, a tokeny wzorca to dokładnie klamry.
    fireEvent.change(pole, { target: { value: 'OF-{YY}/{seq:3}' } });

    const rok = String(new Date().getFullYear()).slice(-2);
    expect(screen.getByText(`OF-${rok}/042`)).toBeInTheDocument();
  });

  it('zapis jest nieaktywny, dopoki nic nie zmieniono', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    const zapisz = screen.getByRole('button', { name: pl.common.save });
    expect(zapisz).toBeDisabled();

    await user.type(screen.getByLabelText(pl.settings.numberPattern), 'X');
    expect(zapisz).toBeEnabled();
  });

  it('nie zapisuje stawki VAT spoza zakresu', async () => {
    // 150% VAT-u to nie jest literowka, ktora ma trafic do dokumentu.
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    const vat = screen.getByLabelText(pl.settings.vatRate);
    await user.clear(vat);
    await user.type(vat, '150');

    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('zapisuje zmieniony komplet ustawien', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

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
    const { unmount } = render(<SettingsAppPage />);
    expect(
      screen.queryByRole('button', { name: pl.settings.numberPatternReset }),
    ).not.toBeInTheDocument();
    unmount();

    mockWorkspace({ numberPattern: 'OF/{seq}' });
    render(<SettingsAppPage />);
    await user.click(screen.getByRole('button', { name: pl.settings.numberPatternReset }));

    expect(screen.getByLabelText(pl.settings.numberPattern)).toHaveValue(DEFAULT_NUMBER_PATTERN);
  });
});

describe('Ustawienia → Aplikacja a wygasly dostep', () => {
  it('blokuje edycje ustawien, ale mowi, ze eksport dziala', () => {
    canWrite.value = false;
    render(<SettingsAppPage />);

    expect(screen.getByText(pl.settings.readOnly)).toBeInTheDocument();
    expect(screen.getByLabelText(pl.settings.numberPattern)).toBeDisabled();
    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
  });
});

describe('Typy pomieszczen (T-73)', () => {
  it('NIE sa w Ustawieniach — mieszkaja w Bibliotece → Pomieszczenia', () => {
    // Dwa miejsca do personalizacji tej samej listy to pytanie „ktore liczy".
    render(<SettingsAppPage />);
    expect(screen.queryByText(pl.settings.roomTypes)).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(pl.settings.roomTypeNamePlaceholder),
    ).not.toBeInTheDocument();
  });
});

describe('Powiadomienia e-mail (T-116)', () => {
  /** Wyłącznik główny zostawia listę rodzajów widoczną, ale nieczynną. */
  it('wylacznik glowny blokuje przelaczniki rodzajow', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    const akceptacja = screen.getByLabelText(pl.notifications.kinds.accepted.label);
    expect(akceptacja).toBeEnabled();

    await user.click(screen.getByLabelText(pl.notifications.enabled));

    // Widoczne — żeby wiadomo było, czego dotyczy wyłącznik — ale nieczynne.
    expect(screen.getByLabelText(pl.notifications.kinds.accepted.label)).toBeDisabled();
  });

  it('zapisuje przelaczniki razem z reszta ustawien workspace', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    await user.click(screen.getByLabelText(pl.notifications.kinds.viewed.label));
    await user.click(screen.getByRole('button', { name: pl.notifications.save }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0]?.[0]).toMatchObject({
      // Reszta ustawień musi przejść nietknięta: sekcja zapisuje CAŁY wiersz
      // `settings`, więc zgubienie ich znaczyłoby ciche skasowanie stawki VAT.
      vatRate: 23,
      numberPattern: DEFAULT_NUMBER_PATTERN,
      notifications: { enabled: true, viewed: false, accepted: true },
    });
  });

  /*
   * Test wysyła prawdziwą wiadomość na ZAPISANY adres. Gdyby dało się go
   * kliknąć przy niezapisanym szkicu, wiadomość poszłaby gdzie indziej niż
   * pokazuje pole — czyli test potwierdzałby coś innego, niż człowiek sprawdza.
   */
  it('test jest nieczynny, dopoki sa niezapisane zmiany', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    const test = screen.getByRole('button', { name: pl.notifications.test });
    expect(test).toBeEnabled();

    await user.click(screen.getByLabelText(pl.notifications.kinds.comment.label));
    expect(screen.getByRole('button', { name: pl.notifications.test })).toBeDisabled();
    expect(testMutate).not.toHaveBeenCalled();
  });

  it('wysyla wiadomosc testowa', async () => {
    const user = userEvent.setup();
    render(<SettingsAppPage />);

    await user.click(screen.getByRole('button', { name: pl.notifications.test }));
    expect(testMutate).toHaveBeenCalledTimes(1);
  });

  /** Puste pole = adres konta; podpowiadamy go zamiast zostawiać pustkę. */
  it('puste pole adresu podpowiada adres konta', () => {
    render(<SettingsAppPage />);

    expect(screen.getByLabelText(pl.notifications.email)).toHaveAttribute(
      'placeholder',
      'projektant@przyklad.pl',
    );
  });
});

describe('podzial Ustawien (2026-08-27)', () => {
  /**
   * Do 2026-08-27 wszystko stalo w jednej kolumnie: ustawienia wycen, kosz,
   * aktualizacje, haslo, eksport danych i kasowanie konta. Ten test pilnuje,
   * zeby sprawy KONTA nie wrocily na karte „Aplikacja" — bo wtedy podzial
   * przestaje cokolwiek porzadkowac.
   */
  it('sprawy konta NIE sa na karcie Aplikacja', () => {
    render(<SettingsAppPage />);

    expect(screen.queryByText(pl.settings.dangerZone)).not.toBeInTheDocument();
    expect(screen.queryByText(pl.settings.access)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: new RegExp(pl.settings.exportData, 'i') }),
    ).not.toBeInTheDocument();
  });

  /** Kosz dostal wlasny ekran w szynie — w Ustawieniach nie ma po nim sladu. */
  it('kosza NIE ma w Ustawieniach', () => {
    render(<SettingsAppPage />);

    expect(screen.queryByText(pl.files.trashTitle)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pl.files.trashEmpty })).not.toBeInTheDocument();
  });
});
