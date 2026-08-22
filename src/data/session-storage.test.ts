import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauriMock = vi.hoisted(() => ({
  runningInTauri: vi.fn(() => false),
  secretGet: vi.fn<(key: string) => Promise<string | null>>(),
  secretSet: vi.fn<(key: string, value: string) => Promise<void>>(),
  secretDelete: vi.fn<(key: string) => Promise<void>>(),
}));

vi.mock('@/lib/tauri', () => tauriMock);

const { createSessionStorage } = await import('./session-storage');

describe('createSessionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('poza Tauri (pnpm dev)', () => {
    beforeEach(() => tauriMock.runningInTauri.mockReturnValue(false));

    it('trzyma sesję w pamięci i nie dotyka keychaina', async () => {
      const storage = createSessionStorage();
      await storage.setItem('anzorge-auth', 'token');

      expect(await storage.getItem('anzorge-auth')).toBe('token');
      expect(tauriMock.secretSet).not.toHaveBeenCalled();
    });

    it('nie zapisuje niczego do localStorage', async () => {
      const storage = createSessionStorage();
      await storage.setItem('anzorge-auth', 'token');
      // Refresh token w localStorage webview to dokładnie to, czego unikamy.
      expect(window.localStorage.getItem('anzorge-auth')).toBeNull();
    });

    it('kasuje wpis', async () => {
      const storage = createSessionStorage();
      await storage.setItem('k', 'v');
      await storage.removeItem('k');
      expect(await storage.getItem('k')).toBeNull();
    });

    it('zwraca null dla nieznanego klucza', async () => {
      expect(await createSessionStorage().getItem('brak')).toBeNull();
    });
  });

  describe('w Tauri', () => {
    beforeEach(() => tauriMock.runningInTauri.mockReturnValue(true));

    it('używa keychaina systemowego', async () => {
      tauriMock.secretSet.mockResolvedValue();
      tauriMock.secretGet.mockResolvedValue('token-z-keychaina');

      const storage = createSessionStorage();
      await storage.setItem('anzorge-auth', 'token');

      expect(tauriMock.secretSet).toHaveBeenCalledWith('anzorge-auth', 'token');
      expect(await storage.getItem('anzorge-auth')).toBe('token-z-keychaina');
    });

    it('schodzi na pamięć, gdy keychain jest niedostępny', async () => {
      tauriMock.secretSet.mockRejectedValue(new Error('brak Secret Service'));
      tauriMock.secretGet.mockRejectedValue(new Error('brak Secret Service'));

      const storage = createSessionStorage();
      await storage.setItem('anzorge-auth', 'token');

      // Aplikacja ma działać dalej — użytkownik zaloguje się ponownie po restarcie.
      expect(await storage.getItem('anzorge-auth')).toBe('token');
    });

    it('wylogowanie czyści keychain nawet przy błędzie', async () => {
      tauriMock.secretDelete.mockRejectedValue(new Error('boom'));
      const storage = createSessionStorage();
      await expect(storage.removeItem('anzorge-auth')).resolves.toBeUndefined();
      expect(tauriMock.secretDelete).toHaveBeenCalledWith('anzorge-auth');
    });
  });
});
