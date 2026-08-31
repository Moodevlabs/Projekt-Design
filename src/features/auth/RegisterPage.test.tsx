import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signUp = vi.hoisted(() => vi.fn());

vi.mock('@/data/supabase', () => ({ getSupabase: () => ({ auth: { signUp } }) }));
vi.mock('@/lib/env', () => ({ isConfigured: true, env: { appEnv: 'local' } }));
const { RegisterPage } = await import('./RegisterPage');
const { AUTH_CALLBACK_URL } = await import('./callback');
const { pl } = await import('@/i18n/pl');

async function wypelnijIWyslij() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText(pl.auth.company), 'Pracownia Nova');
  await user.type(screen.getByLabelText(pl.auth.fullName), 'Kamil Nowak');
  await user.type(screen.getByLabelText(pl.auth.email), 'kamil@pracownia.pl');
  await user.type(screen.getByLabelText(pl.auth.password), 'tajnehaslo123');
  await user.click(screen.getByRole('button', { name: pl.auth.register }));
}

beforeEach(() => {
  vi.clearAllMocks();
  signUp.mockResolvedValue({ data: { session: null }, error: null });
});

describe('RegisterPage — adres powrotu z maila potwierdzającego (T-118)', () => {
  /*
   * To jest test regresji, nie test funkcji. `emailRedirectTo` łatwo zgubić
   * przy refaktorze, bo bez niego wszystko wygląda poprawnie: rejestracja się
   * udaje, mail przychodzi. Dopiero KLIKNIĘCIE w mailu odsyła pod Site URL
   * projektu — czyli świeżo założony projekt wysyła użytkownika na
   * `localhost:3000`, a objaw wygląda jak zepsuty szablon wiadomości.
   */
  it('rejestracja podaje deep link aplikacji jako adres powrotu', async () => {
    await wypelnijIWyslij();

    expect(signUp).toHaveBeenCalledTimes(1);
    expect(signUp.mock.calls[0]?.[0]).toMatchObject({
      email: 'kamil@pracownia.pl',
      options: { emailRedirectTo: AUTH_CALLBACK_URL },
    });
  });

  it('adres powrotu to deep link obsługiwany przez aplikację', () => {
    // `deep-links.ts` nasłuchuje dokładnie na tym adresie. Rozjazd znaczyłby,
    // że potwierdzenie maila wraca tam, gdzie nikt nie słucha.
    expect(AUTH_CALLBACK_URL).toBe('toolier://auth/callback');
  });

  it('dane pracowni nadal lecą do triggera handle_new_user', async () => {
    await wypelnijIWyslij();

    expect(signUp.mock.calls[0]?.[0]).toMatchObject({
      options: { data: { company: 'Pracownia Nova', full_name: 'Kamil Nowak' } },
    });
  });
});
