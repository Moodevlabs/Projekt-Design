import { pl } from '@/i18n/pl';

/**
 * Podpis wytłoczony w powierzchni aplikacji.
 *
 * Leży na dole okna jako warstwa **pod** treścią: renderowany przed resztą
 * aplikacji i bez własnego `z-index`, więc panele — sidebar, karty, tabele —
 * rysują się nad nim. Nie zabiera miejsca w układzie i nie przesuwa treści.
 *
 * Karty są ze szkła, więc tam, gdzie któraś nad nim przechodzi, podpis
 * prześwituje — i o to chodzi: ma być częścią powierzchni, a nie elementem
 * interfejsu. `aria-hidden`, bo to sygnatura, nie treść.
 */
export function AppCredit() {
  return (
    <p
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-3 text-center text-[10.5px] font-semibold tracking-[0.2em] uppercase select-none"
      style={{
        color: 'rgba(22, 24, 28, 0.52)',
        textShadow: '0 1px 0 rgba(255, 255, 255, 0.55)',
      }}
    >
      {pl.app.credit}
    </p>
  );
}
