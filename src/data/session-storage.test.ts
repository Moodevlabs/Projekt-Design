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
      await storage.setItem('toolier-auth', 'token');

      expect(await storage.getItem('toolier-auth')).toBe('token');
      expect(tauriMock.secretSet).not.toHaveBeenCalled();
    });

    it('nie zapisuje niczego do localStorage', async () => {
      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'token');
      // Refresh token w localStorage webview to dokładnie to, czego unikamy.
      expect(window.localStorage.getItem('toolier-auth')).toBeNull();
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

    it('zapisuje sesję do keychaina systemowego', async () => {
      tauriMock.secretSet.mockResolvedValue();
      tauriMock.secretGet.mockResolvedValue('token-z-keychaina');

      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'token');

      expect(tauriMock.secretSet).toHaveBeenCalledWith('toolier-auth', 'token');
      // Odczyt po zapisie oddaje to, co zapisano — nie starą zawartość keychaina.
      expect(await storage.getItem('toolier-auth')).toBe('token');
    });

    it('schodzi na pamięć, gdy keychain jest niedostępny', async () => {
      tauriMock.secretSet.mockRejectedValue(new Error('brak Secret Service'));
      tauriMock.secretGet.mockRejectedValue(new Error('brak Secret Service'));

      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'token');

      // Aplikacja ma działać dalej — użytkownik zaloguje się ponownie po restarcie.
      expect(await storage.getItem('toolier-auth')).toBe('token');
    });

    it('REGRESJA: nieudany zapis nie może unieważnić świeżej sesji', async () => {
      // Tak wyglądała awaria: zapis do keychaina padał (sesja Supabase nie
      // mieściła się w limicie wpisu Windows), ale odczyt nadal pytał keychain,
      // który uczciwie odpowiadał „brak wpisu". Sesja znikała tuż po zalogowaniu,
      // a supabase-js wysyłał kolejne zapytania jako `anon` — użytkownik widział
      // aplikację bez żadnych danych.
      tauriMock.secretSet.mockRejectedValue(new Error('wartość za duża'));
      tauriMock.secretGet.mockResolvedValue(null);

      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'swieza-sesja');

      expect(await storage.getItem('toolier-auth')).toBe('swieza-sesja');
    });

    it('czyta z pamięci zamiast bić po keychainie przy każdym żądaniu', async () => {
      tauriMock.secretSet.mockResolvedValue();
      tauriMock.secretGet.mockResolvedValue('z-keychaina');

      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'token');

      await storage.getItem('toolier-auth');
      await storage.getItem('toolier-auth');
      await storage.getItem('toolier-auth');

      // supabase-js czyta sesję przed żądaniami; każdy odczyt to skok do Rusta.
      expect(tauriMock.secretGet).not.toHaveBeenCalled();
    });

    it('po restarcie podnosi sesję z keychaina', async () => {
      tauriMock.secretGet.mockResolvedValue('sesja-po-restarcie');

      const storage = createSessionStorage();
      expect(await storage.getItem('toolier-auth')).toBe('sesja-po-restarcie');
      expect(tauriMock.secretGet).toHaveBeenCalledWith('toolier-auth');
    });

    it('wylogowanie czyści też pamięć, nie tylko keychain', async () => {
      tauriMock.secretSet.mockResolvedValue();
      tauriMock.secretDelete.mockResolvedValue();
      tauriMock.secretGet.mockResolvedValue('duch-poprzedniej-sesji');

      const storage = createSessionStorage();
      await storage.setItem('toolier-auth', 'token');
      await storage.removeItem('toolier-auth');

      // Gdyby usuwanie czyściło wyłącznie keychain, kolejny odczyt oddałby
      // sesję poprzedniego użytkownika z pamięci procesu.
      expect(await storage.getItem('toolier-auth')).toBe('duch-poprzedniej-sesji');
      expect(tauriMock.secretDelete).toHaveBeenCalledWith('toolier-auth');
    });

    it('wylogowanie czyści keychain nawet przy błędzie', async () => {
      tauriMock.secretDelete.mockRejectedValue(new Error('boom'));
      const storage = createSessionStorage();
      await expect(storage.removeItem('toolier-auth')).resolves.toBeUndefined();
      expect(tauriMock.secretDelete).toHaveBeenCalledWith('toolier-auth');
    });
  });
});
