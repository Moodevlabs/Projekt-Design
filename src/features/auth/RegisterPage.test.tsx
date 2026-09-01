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

/** Wypełnia pola. `zgoda: false` zostawia checkbox pusty (T-124). */
async function wypelnij({ zgoda = true }: { zgoda?: boolean } = {}) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

  await user.type(screen.getByLabelText(pl.auth.company), 'Pracownia Nova');
  await user.type(screen.getByLabelText(pl.auth.fullNameOptional), 'Kamil Nowak');
  await user.type(screen.getByLabelText(pl.auth.email), 'kamil@pracownia.pl');
  await user.type(screen.getByLabelText(pl.auth.password), 'tajnehaslo123');
  if (zgoda) await user.click(screen.getByRole('checkbox'));
  return user;
}

async function wypelnijIWyslij() {
  const user = await wypelnij();
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

/**
 * T-124: bez akceptacji regulaminu i polityki prywatności nie ma umowy.
 *
 * Zgoda musi być czynnością wyraźną (art. 4 pkt 11 RODO), więc checkbox
 * startuje pusty i nie wolno go zaznaczać domyślnie — a próba rejestracji
 * bez niego ma się zatrzymać z komunikatem, a nie przejść cicho dalej.
 */
describe('RegisterPage — akceptacja regulaminu (T-124)', () => {
  it('checkbox startuje pusty', async () => {
    await wypelnij({ zgoda: false });

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('bez zaznaczenia rejestracja się nie odbywa i pokazuje powód', async () => {
    const user = await wypelnij({ zgoda: false });
    await user.click(screen.getByRole('button', { name: pl.auth.register }));

    expect(signUp).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Akceptacja regulaminu jest wymagana do założenia konta'),
    ).toBeInTheDocument();
  });

  it('prowadzi do obu dokumentów pod publicznymi adresami', async () => {
    await wypelnij({ zgoda: false });

    expect(screen.getByRole('link', { name: pl.auth.termsTerms })).toHaveAttribute(
      'href',
      'https://toolier.pl/regulamin',
    );
    expect(screen.getByRole('link', { name: pl.auth.termsPrivacy })).toHaveAttribute(
      'href',
      'https://toolier.pl/polityka-prywatnosci',
    );
  });

  it('po zaznaczeniu rejestracja przechodzi', async () => {
    await wypelnijIWyslij();

    expect(signUp).toHaveBeenCalledTimes(1);
  });
});

/**
 * Imię i nazwisko jest opcjonalne (2026-09-01). Pusty napis nie ma trafiać do
 * profilu jako `''` — to co innego niż „nie podano".
 */
describe('RegisterPage — imię i nazwisko jest opcjonalne', () => {
  it('rejestracja przechodzi bez podania nazwiska', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(pl.auth.company), 'Pracownia Nova');
    await user.type(screen.getByLabelText(pl.auth.email), 'kamil@pracownia.pl');
    await user.type(screen.getByLabelText(pl.auth.password), 'tajnehaslo123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: pl.auth.register }));

    expect(signUp).toHaveBeenCalledTimes(1);

    // Klucz ma WYPAŚĆ z metadanych — w profilu ma powstać NULL, nie pusty
    // napis. Jawne typowanie, bo `mock.calls` jest nietypowane, a asercja na
    // `any` niczego by nie pilnowała.
    const [args] = signUp.mock.calls[0] as [{ options: { data: Record<string, unknown> } }];
    expect(args.options.data).not.toHaveProperty('full_name');
    expect(args.options.data).toMatchObject({ company: 'Pracownia Nova' });
  });
});
