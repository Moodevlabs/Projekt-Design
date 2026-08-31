/**
 * Odnośniki dla klienta — wizualizacje na Dysku Google, spacer 3D, moodboard
 * (T-116).
 *
 * ## Po co osobny plik
 *
 * Adres wpisuje człowiek, a wyświetla go **strona klienta**, czyli miejsce,
 * w którym nie ma ani naszego kodu obok, ani możliwości poprawienia błędu na
 * gorąco. Wszystko, co dotyczy tego, jak z „drive.google.com/…" wpisanego
 * w pośpiechu robi się bezpieczny `href`, siedzi tutaj i jest testowalne bez
 * Reacta.
 *
 * ## Dlaczego schemat URL-a jest sprawdzany, a nie „ufamy projektantowi"
 *
 * `javascript:alert(1)` wpisany w pole adresu i wstawiony do `href` wykonuje
 * się przy kliknięciu — na stronie, którą otwiera inwestor. Że wpisał go
 * właściciel workspace'u, niczego nie zmienia: dokument przechodzi przez
 * bazę, wersje wyceny i snapshot akceptacji, a każde z tych miejsc może go
 * później komuś pokazać. Wpuszczamy więc wyłącznie `http:` i `https:`,
 * i robimy to **dwa razy** — przy zapisie (żeby śmieć nie wszedł do bazy)
 * i przy renderowaniu (bo w bazie leżą też dokumenty sprzed tej reguły).
 */

/** Ile odnośników wolno dołączyć do jednej wyceny. */
export const MAX_QUOTE_LINKS = 12;

/**
 * Czy adres nadaje się do `href` na stronie klienta.
 *
 * Świadomie bez `mailto:` i `tel:` — to jest lista materiałów do obejrzenia,
 * a kontakt do pracowni stoi w stopce oferty.
 */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Adres wpisany przez człowieka → adres, który da się kliknąć.
 *
 * Ludzie kopiują z paska przeglądarki („https://…"), ale wpisują też
 * „drive.google.com/folders/…" bez schematu. Drugie bez uzupełnienia jest
 * traktowane przez `new URL` jako adres względny, więc link prowadziłby
 * w nikąd. Dokładamy `https://` — nie `http://`, bo dziś to `https` jest
 * domyślnym założeniem, a serwis, który go nie ma, i tak przekieruje.
 *
 * `null` znaczy „to nie jest adres" i jest sygnałem dla UI, żeby pokazać
 * błąd zamiast zapisać coś, czego klient nie otworzy.
 */
export function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  // Białe znaki w środku adresu to prawie zawsze sklejone dwa linki albo
  // wklejone zdanie — `new URL` część z nich przepuszcza, kodując spacje.
  if (/\s/.test(trimmed)) return null;

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!isSafeHttpUrl(candidate)) return null;

  // Adres bez kropki w nazwie hosta („https://dysk") nie jest adresem
  // publicznym — a to jedyne, co ma sens w ofercie dla inwestora.
  try {
    const url = new URL(candidate);
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Skrócony adres do pokazania pod nazwą odnośnika („drive.google.com").
 *
 * Klient ma widzieć, DOKĄD go wysyłamy, zanim kliknie — pełny adres do
 * folderu na Dysku ma 90 znaków i nie mówi nic poza tym, że jest długi.
 */
export function linkHostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

/**
 * Nazwa odnośnika do wyświetlenia. Pusta etykieta to normalny stan —
 * ktoś wkleił sam adres i tyle; wtedy nazwą jest host.
 */
export function linkDisplayLabel(link: { label: string; url: string }): string {
  const label = link.label.trim();
  return label === '' ? linkHostLabel(link.url) : label;
}
