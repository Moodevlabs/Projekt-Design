import { useEffect, useState } from 'react';

import { env, isConfigured } from '@/lib/env';

/**
 * Czy mamy łączność (T-29).
 *
 * ## Dlaczego nie samo `navigator.onLine`
 *
 * `navigator.onLine` mówi tylko tyle, że **karta sieciowa ma jakieś łącze**.
 * Wi-Fi w hotelu z ekranem logowania, VPN bez trasy do internetu albo
 * padnięty Supabase to wszystko `onLine === true`. Odwrotnie bywa rzadziej,
 * ale też: `false` przy działającym połączeniu przez adapter wirtualny.
 *
 * Dlatego traktujemy je jako **szybką podpowiedź**, a prawdę sprawdzamy
 * lekkim żądaniem do Supabase. `onLine === false` skraca drogę (nie ma po co
 * pytać), ale `true` samo w sobie nie wystarcza.
 */

/** Co ile sprawdzamy łączność, gdy jesteśmy offline. */
const OFFLINE_POLL_MS = 15_000;

/** Co ile potwierdzamy łączność, gdy jesteśmy online. */
const ONLINE_POLL_MS = 60_000;

/** Po tylu ms bez odpowiedzi uznajemy, że sieci nie ma. */
const PROBE_TIMEOUT_MS = 5_000;

/**
 * Jedno lekkie żądanie do Supabase.
 *
 * Pytamy o `/auth/v1/health` — endpoint bez autoryzacji, zwracający kilka
 * bajtów. Zapytanie o dane wymagałoby sesji i mieszałoby „nie ma sieci"
 * z „wygasł token".
 */
export async function probeConnection(signal?: AbortSignal): Promise<boolean> {
  if (!isConfigured) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const response = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    // Każda odpowiedź HTTP znaczy, że serwer odpowiada — także 4xx.
    // Interesuje nas łączność, nie to, czy endpoint nas lubi.
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Stan łączności do interfejsu.
 *
 * Startuje jako `online`, a nie `unknown`: aplikacja uruchamiana normalnie ma
 * sieć, a pokazanie paska „offline" na ułamek sekundy przy każdym starcie
 * byłoby fałszywym alarmem częstszym niż prawdziwy.
 */
export function useConnectivity(): { online: boolean; recheck: () => void } {
  const [online, setOnline] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const check = async () => {
      const result = await probeConnection(controller.signal);
      if (!cancelled) setOnline(result);
    };

    void check();
    const interval = setInterval(() => void check(), online ? ONLINE_POLL_MS : OFFLINE_POLL_MS);

    // Zdarzenia przeglądarki nie są źródłem prawdy, ale są DARMOWYM
    // sygnałem, że warto sprawdzić od razu, zamiast czekać na interwał.
    const wake = () => void check();
    window.addEventListener('online', wake);
    window.addEventListener('offline', wake);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', wake);
    };
  }, [online, tick]);

  return { online, recheck: () => setTick((value) => value + 1) };
}
