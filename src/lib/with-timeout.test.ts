import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimeoutError, withTimeout } from './with-timeout';

describe('withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('przepuszcza wynik, gdy obietnica zdąży', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 'za późno')).resolves.toBe(42);
  });

  it('przepuszcza błąd obietnicy bez zmian', async () => {
    await expect(withTimeout(Promise.reject(new Error('sieć')), 1000, 'za późno')).rejects.toThrow(
      'sieć',
    );
  });

  it('po limicie odrzuca TimeoutError z podanym komunikatem', async () => {
    vi.useFakeTimers();
    const wisząca = new Promise<never>(() => {});
    const wynik = withTimeout(wisząca, 5000, 'Trwa zbyt długo');
    const oczekiwanie = wynik.then(
      () => {
        throw new Error('nie powinno się udać');
      },
      (error: unknown) => {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as Error).message).toBe('Trwa zbyt długo');
      },
    );
    vi.advanceTimersByTime(5000);
    await oczekiwanie;
  });
});
