import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.hoisted(() => vi.fn());

vi.mock('@/data/supabase', () => ({
  getSupabase: () => ({ auth: { exchangeCodeForSession } }),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }));
vi.mock('@/lib/tauri', () => ({ runningInTauri: () => true }));

const { completeOAuthFromUrl, AUTH_CALLBACK_URL } = await import('./oauth');

describe('completeOAuthFromUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('wymienia kod z query na sesję', async () => {
    await expect(completeOAuthFromUrl(`${AUTH_CALLBACK_URL}?code=abc123`)).resolves.toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('czyta kod również z fragmentu', async () => {
    await expect(completeOAuthFromUrl(`${AUTH_CALLBACK_URL}#code=xyz`)).resolves.toBe(true);
    expect(exchangeCodeForSession).toHaveBeenCalledWith('xyz');
  });

  it('zwraca false, gdy w linku nie ma kodu', async () => {
    await expect(completeOAuthFromUrl(AUTH_CALLBACK_URL)).resolves.toBe(false);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('zwraca false dla niepoprawnego URL', async () => {
    await expect(completeOAuthFromUrl('to nie jest url')).resolves.toBe(false);
  });

  it('rzuca opisem błędu z Supabase', async () => {
    await expect(
      completeOAuthFromUrl(`${AUTH_CALLBACK_URL}?error=access_denied&error_description=Odmowa`),
    ).rejects.toThrow('Odmowa');
  });

  it('propaguje błąd wymiany kodu', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error('kod wygasł') });
    await expect(completeOAuthFromUrl(`${AUTH_CALLBACK_URL}?code=stary`)).rejects.toThrow(
      'kod wygasł',
    );
  });
});
