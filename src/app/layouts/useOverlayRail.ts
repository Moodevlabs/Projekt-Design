import { useEffect, useState } from 'react';

/**
 * Poniżej tej szerokości okna rozwinięta szyna nie mieści się OBOK treści.
 *
 * Liczy się z konkretów, a nie „na oko": okno aplikacji ma `minWidth: 1024`
 * (`tauri.conf.json`), rozwinięta szyna zabiera 244 px, a arkusz wyceny —
 * najszerszy widok w aplikacji — chce 1fr + 336 px prawej szyny plus 56 px
 * marginesów. Przy 1024 px zostaje na pracę niecałe 390 px i wszystko, co ma
 * własną minimalną szerokość (tabele, paski narzędzi), zaczyna wystawać poza
 * krawędź. Od 1280 px szyna i treść żyją obok siebie bez ściskania.
 */
const OVERLAY_BELOW_PX = 1280;

const QUERY = `(max-width: ${OVERLAY_BELOW_PX - 1}px)`;

function read(): boolean {
  // `matchMedia` nie istnieje w środowisku testów node ani przy renderze
  // serwerowym — brak odpowiedzi traktujemy jako „szeroko", czyli tak jak
  // zachowywała się aplikacja, zanim ten tryb powstał.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Czy rozwinięta szyna ma się kłaść NA treści, zamiast ją odsuwać.
 *
 * Zwinięta szyna (76 px) zostaje w układzie zawsze — to pasek, po którym
 * nawiguje się jednym kliknięciem, a nie coś, co ma się chować.
 */
export function useOverlayRail(): boolean {
  const [overlay, setOverlay] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(QUERY);
    const onChange = () => setOverlay(media.matches);

    // Stan czytamy jeszcze raz: między pierwszym renderem a tym efektem okno
    // mogło zmienić rozmiar (przywrócenie sesji, drugi monitor).
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return overlay;
}
