import { pl } from '@/i18n/pl';

/**
 * Podpis wytłoczony w powierzchni aplikacji.
 *
 * Leży na dole okna jako warstwa **pod** treścią: renderowany przed resztą
 * aplikacji i bez własnego `z-index`, więc całe UI rysuje się nad nim.
 * Nie zabiera miejsca w układzie i nie przesuwa treści.
 *
 * Warunek konieczny: korzeń powłoki musi być **pozycjonowany** (`relative`).
 * Element pozycjonowany — a taki jest ten podpis — rysuje się nad każdą
 * statyczną treścią niezależnie od kolejności w drzewie. Bez tego podpis
 * przechodził nad arkuszem wyceny (papier nie ma `position`), choć karty
 * z `position: relative` już go poprawnie zasłaniały.
 *
 * Podpis ma być częścią powierzchni, a nie elementem interfejsu.
 * `aria-hidden`, bo to sygnatura, nie treść.
 *
 * Wytłoczenie robią dwie warstwy naraz: ciepły atrament w niskiej kryciu
 * i biały odblask **pod** literą. Sam kolor dałby napis leżący NA tle;
 * odblask sprawia, że litera wygląda na wciśniętą w papier.
 */
export function AppCredit() {
  return (
    <p
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-3 text-center text-[10.5px] font-semibold tracking-[0.2em] uppercase select-none"
      style={{
        color: 'rgba(51, 37, 30, 0.38)',
        textShadow: '0 1px 0 rgba(255, 255, 255, 0.7)',
      }}
    >
      {pl.app.credit}
    </p>
  );
}
