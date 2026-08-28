/**
 * Sprawdzenie adresu strony klienta (`VITE_SHARE_BASE_URL`).
 *
 * ## Po co osobny plik
 *
 * Czyta go `vite.config.ts`, czyli Node w czasie budowania — dlatego bez zod
 * i bez czegokolwiek z Reacta. Sam `URL` z platformy wystarczy, a dzięki temu
 * konfiguracja builda nie wciąga za sobą zależności aplikacji.
 *
 * ## Czemu w ogóle sprawdzamy
 *
 * Ta wartość jest **wkompilowywana w aplikację** w chwili budowania wydania
 * i decyduje o adresie, który projektant wysyła inwestorowi. Gdy jej brakuje,
 * `ShareDialog` nie ma z czego złożyć linku i pokazuje goły token — aplikacja
 * działa, wydanie się buduje, a błąd wychodzi dopiero wtedy, gdy ktoś próbuje
 * wysłać ofertę klientowi. Literówka w sekrecie CI kosztuje więc całe wydanie.
 * To ta sama klasa wpadki co niepodbita wersja przy v1.1.1 i ma tu takie samo
 * lekarstwo: build przerywa się w kilka sekund, zamiast wypuścić zepsutą paczkę.
 */

/** Adres jest poprawny albo mamy powód, dla którego nie jest. */
export type ShareBaseUrlCheck = { ok: true } | { ok: false; reason: string };

export function checkShareBaseUrl(value: string | undefined): ShareBaseUrlCheck {
  const trimmed = (value ?? '').trim();

  if (trimmed === '') {
    return {
      ok: false,
      reason:
        'jest pusty. Bez niego aplikacja pokaże projektantowi sam token zamiast adresu oferty.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: `„${trimmed}" nie jest poprawnym adresem URL.` };
  }

  if (parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: `ma schemat „${parsed.protocol}". Wydanie produkcyjne wymaga „https:" — oferta niesie dane inwestora.`,
    };
  }

  // Ścieżka w bazie rozjechałaby adres z regułami hostingu: `buildShareUrl`
  // dokleja `/q/{token}`, a `vercel.json` przepisuje na aplikację wyłącznie
  // `/q/*` i `/b/*`. Baza `https://host/oferty` dałaby `/oferty/q/{token}`,
  // czyli adres, pod którym klient zobaczy 404 zamiast oferty.
  if (parsed.pathname !== '/') {
    return {
      ok: false,
      reason: `zawiera ścieżkę „${parsed.pathname}". Podaj sam adres hosta — aplikacja sama dokleja /q/{token} i /b/{token}.`,
    };
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    return {
      ok: false,
      reason: 'zawiera parametry zapytania albo kotwicę. Podaj sam adres hosta.',
    };
  }

  return { ok: true };
}
