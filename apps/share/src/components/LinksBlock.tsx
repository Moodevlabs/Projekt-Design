import { isSafeHttpUrl, linkDisplayLabel, linkHostLabel, type QuoteLink } from '@/domain/quote';

/**
 * Materiały do obejrzenia — odnośniki dołączone do oferty (T-116).
 *
 * Wizualizacje, spacer 3D czy moodboard leżą tam, gdzie projektant je trzyma
 * (Dysk Google, Dropbox, WeTransfer). Do tej pory szły osobnym mailem, więc
 * inwestor podejmował decyzję o zakresie, patrząc na coś, czego nie było
 * widać obok oferty. Blok stoi **nad panelem decyzji**, z tego samego powodu
 * co harmonogram: to jest materiał do decyzji, a nie dodatek po niej.
 *
 * ⚠️ **Adres sprawdzamy jeszcze raz, tutaj.** Aplikacja normalizuje go przy
 * zapisie, ale w bazie leżą też dokumenty sprzed T-116 i takie, do których
 * dane trafiły inną drogą (import, przywrócona wersja). `href` z treścią
 * `javascript:…` wykonałby się w przeglądarce inwestora — a to jest jedyna
 * strona w całym produkcie, którą otwiera ktoś z zewnątrz. Odnośnik, który
 * nie przechodzi sprawdzenia, po prostu nie jest linkiem: pokazujemy nazwę
 * tekstem, żeby nie udawać, że oferta jest niepełna.
 */
export function LinksBlock({ links }: { links: QuoteLink[] }) {
  const usable = links.filter((link) => link.url.trim() !== '');
  if (usable.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg tracking-tight">Materiały do obejrzenia</h2>
      <p className="text-ink-soft mt-1 text-xs">
        Odnośniki prowadzą do materiałów przygotowanych przez pracownię. Otwierają się w nowej
        karcie.
      </p>

      <ul className="mt-3 space-y-2">
        {usable.map((link) => {
          const safe = isSafeHttpUrl(link.url);
          const label = linkDisplayLabel(link);

          return (
            <li
              key={link.id}
              className="border-hair rounded-lg border px-4 py-3 transition-colors hover:border-[var(--accent)]"
            >
              {safe ? (
                <a
                  href={link.url}
                  target="_blank"
                  // `noopener` to nie kosmetyka: bez niego otwarta strona
                  // dostaje `window.opener` i może podmienić adres karty
                  // z ofertą pod nieobecność patrzącego.
                  rel="noopener noreferrer"
                  className="block text-sm font-medium underline-offset-4 hover:underline"
                >
                  {label}
                  <span className="text-ink-soft block text-xs font-normal">
                    {linkHostLabel(link.url)}
                  </span>
                </a>
              ) : (
                <span className="block text-sm font-medium">{label}</span>
              )}

              {link.note.trim() !== '' ? (
                <p className="text-ink-soft mt-1 text-xs leading-relaxed">{link.note}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
