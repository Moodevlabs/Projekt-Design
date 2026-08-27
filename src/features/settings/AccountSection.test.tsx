import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthStub } from '@/features/auth/test-utils';
import { pl } from '@/i18n/pl';

const invoke = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const exportData = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/data/supabase', () => ({
  getSupabase: () => ({ functions: { invoke }, auth: { updateUser } }),
}));
vi.mock('./useExportData', () => ({
  useExportData: () => ({ exportData, exporting: false }),
}));
vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError, info: vi.fn() },
}));

// Zdjecie uzytkownika (poprawka 4) ma wlasne zapytania — sekcje konta
// testujemy w izolacji od warstwy danych, tak jak reszte tego pliku.
vi.mock('@/data/queries/useAvatar', () => ({
  useAvatarPath: () => null,
  useAvatarUrl: () => ({ data: null }),
  useUploadAvatar: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveAvatar: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { AccountSection } = await import('./AccountSection');

const signOut = vi.fn(() => Promise.resolve());

function renderSection() {
  return render(
    <AuthStub signOut={signOut}>
      <AccountSection />
    </AuthStub>,
  );
}

const POTWIERDZENIE = 'USUŃ';
const etykietaPola = pl.settings.deleteAccountConfirmLabel(POTWIERDZENIE);

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockResolvedValue({ data: { deleted: true }, error: null });
  updateUser.mockResolvedValue({ error: null });
});

describe('Kasowanie konta', () => {
  it('przycisk jest martwy, dopoki nie przepisze sie slowa', async () => {
    const user = userEvent.setup();
    renderSection();

    const przycisk = screen.getByRole('button', { name: pl.settings.deleteAccount });
    expect(przycisk).toBeDisabled();

    await user.type(screen.getByLabelText(etykietaPola), 'tak');
    expect(przycisk).toBeDisabled();

    await user.clear(screen.getByLabelText(etykietaPola));
    await user.type(screen.getByLabelText(etykietaPola), POTWIERDZENIE);
    expect(przycisk).toBeEnabled();
  });

  it('samo przepisanie slowa jeszcze niczego nie kasuje', async () => {
    // Dwie bariery, nie jedna: pole ORAZ potwierdzenie w dialogu. To jedyna
    // operacja w aplikacji, po ktorej nie ma powrotu.
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(etykietaPola), POTWIERDZENIE);
    await user.click(screen.getByRole('button', { name: pl.settings.deleteAccount }));

    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByText(pl.settings.deleteAccountTitle)).toBeInTheDocument();
  });

  it('kasuje dopiero po potwierdzeniu w dialogu i wylogowuje', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(etykietaPola), POTWIERDZENIE);
    await user.click(screen.getByRole('button', { name: pl.settings.deleteAccount }));

    const dialog = screen.getByRole('dialog');
    const potwierdz = within(dialog).getByRole('button', { name: pl.settings.deleteAccount });
    await user.click(potwierdz);

    expect(invoke).toHaveBeenCalledWith('delete-account', { body: {} });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('nieudane kasowanie nie wylogowuje — konto dalej istnieje', async () => {
    // Wylogowanie po bledzie zostawiloby czlowieka na ekranie logowania
    // w przekonaniu, ze konta juz nie ma.
    invoke.mockResolvedValue({ data: null, error: new Error('Stripe nie odpowiada') });
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(etykietaPola), POTWIERDZENIE);
    await user.click(screen.getByRole('button', { name: pl.settings.deleteAccount }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: pl.settings.deleteAccount }));

    expect(signOut).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Stripe nie odpowiada');
  });
});

describe('Eksport i haslo', () => {
  it('eksport danych jest dostepny obok kasowania konta', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: pl.settings.exportData }));
    expect(exportData).toHaveBeenCalledTimes(1);
  });

  it('nie zmienia hasla, gdy powtorzenie sie nie zgadza', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(pl.settings.newPassword), 'tajnehaslo1');
    await user.type(screen.getByLabelText(pl.settings.repeatPassword), 'innehaslo1');
    await user.click(screen.getByRole('button', { name: pl.settings.changePassword }));

    expect(updateUser).not.toHaveBeenCalled();
  });

  it('zmienia haslo i czysci formularz', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.type(screen.getByLabelText(pl.settings.newPassword), 'tajnehaslo1');
    await user.type(screen.getByLabelText(pl.settings.repeatPassword), 'tajnehaslo1');
    await user.click(screen.getByRole('button', { name: pl.settings.changePassword }));

    expect(updateUser).toHaveBeenCalledWith({ password: 'tajnehaslo1' });
    expect(screen.getByLabelText(pl.settings.newPassword)).toHaveValue('');
  });
});
