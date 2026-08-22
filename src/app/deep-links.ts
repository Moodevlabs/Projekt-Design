/**
 * Rejestracja obsługi `anzorge://…`. Wołane raz, przy starcie aplikacji.
 *
 * Ścieżki:
 *  - `anzorge://auth/callback?code=…`   → wymiana kodu OAuth na sesję
 *  - `anzorge://auth/recovery?code=…`   → powrót z maila „reset hasła"
 *  - `anzorge://billing/success|cancel` → obsługa w T-15
 */
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { completeOAuthFromUrl } from '@/features/auth/oauth';
import { runningInTauri } from '@/lib/tauri';
import { createLogger } from '@/lib/logger';

const log = createLogger('deep-link');

export type DeepLinkHandler = (url: URL) => void;

export interface DeepLinkHandlers {
  /** Powrót ze Stripe Checkout / Portalu (T-15). */
  onBilling?: DeepLinkHandler;
  /** Powrót z maila „reset hasła" — sesja jest już wymieniona. */
  onRecovery?: DeepLinkHandler;
}

export async function registerDeepLinks(handlers: DeepLinkHandlers = {}): Promise<() => void> {
  if (!runningInTauri()) return () => undefined;

  try {
    return await onOpenUrl((urls) => {
      for (const raw of urls) {
        void handleUrl(raw, handlers);
      }
    });
  } catch (error) {
    log.warn('Nie udało się zarejestrować deep linków', error);
    return () => undefined;
  }
}

async function handleUrl(raw: string, handlers: DeepLinkHandlers): Promise<void> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    log.warn('Niepoprawny deep link', raw);
    return;
  }

  // Dla `anzorge://auth/callback` host to „auth", a pathname „/callback".
  if (url.host === 'auth') {
    try {
      const handled = await completeOAuthFromUrl(raw);
      if (!handled) {
        log.warn('Deep link auth bez kodu', url.pathname);
        return;
      }
      // `/recovery` prowadzi do ekranu ustawienia nowego hasła; `/callback` kończy
      // logowanie — tam wystarczy, że `onAuthStateChange` przestawi stan.
      if (url.pathname.startsWith('/recovery')) handlers.onRecovery?.(url);
    } catch (error) {
      log.error('Nie udało się dokończyć logowania', error);
    }
    return;
  }

  if (url.host === 'billing') {
    handlers.onBilling?.(url);
    return;
  }

  log.warn('Nieobsłużony deep link', url.host);
}
