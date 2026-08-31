import { useMutation } from '@tanstack/react-query';

import { getSupabase } from '@/data/supabase';
import { RepoError } from '@/data/repos/errors';

/**
 * Wiadomość testowa z ekranu ustawień (T-116).
 *
 * Jedyne wywołanie funkcji `notify` z aplikacji — całą resztę (opróżnianie
 * kolejki) robi cron, bez udziału człowieka. Dlatego to jest mutacja bez
 * zapytania obok: nie ma tu żadnego stanu do pobrania, jest jedna czynność
 * i jedna odpowiedź na pytanie „czy powiadomienia w ogóle dochodzą".
 *
 * Zwraca adres, na który poszła wiadomość — komunikat „wysłano na
 * biuro@pracownia.pl" mówi o jedno więcej niż „wysłano": potwierdza, że
 * adresatem jest ten, kogo użytkownik się spodziewa.
 */
export function useSendTestNotification() {
  return useMutation<string, Error, void>({
    mutationFn: async () => {
      const response = await getSupabase().functions.invoke<{ ok?: boolean; to?: string }>(
        'notify',
        { body: { action: 'test' } },
      );

      if (response.error) {
        /*
         * `FunctionsHttpError` nosi treść błędu w ciele odpowiedzi, a nie
         * w `message` — bez tego użytkownik dostaje „Edge Function returned
         * a non-2xx status code" zamiast „Brak RESEND_API_KEY w sekretach
         * funkcji", czyli zamiast jedynej informacji, która pozwala to
         * naprawić.
         */
        const failure: unknown = response.error;
        const detail = await readFunctionError(failure);
        const fallback = failure instanceof Error ? failure.message : 'Wysyłka nie powiodła się.';
        throw new RepoError(detail ?? fallback);
      }

      return response.data?.to ?? '';
    },
  });
}

async function readFunctionError(error: unknown): Promise<string | null> {
  const context: unknown = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;

  try {
    const body: unknown = await context.clone().json();
    if (typeof body !== 'object' || body === null) return null;
    const message: unknown = (body as { error?: unknown }).error;
    return typeof message === 'string' ? message : null;
  } catch {
    return null;
  }
}
