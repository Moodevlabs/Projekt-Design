import { pl } from '@/i18n/pl';

/**
 * Podpis wytłoczony w tle aplikacji.
 *
 * Leży tuż nad polem światła, ale renderuje się PRZED resztą aplikacji, więc
 * szklane panele przechodzą nad nim i lekko go rozmywają — ma być częścią
 * powierzchni, a nie elementem interfejsu. (Ujemny `z-index` schowałby go pod
 * nieprzezroczystym tłem strony.) Efekt wytłoczenia daje bardzo niski kontrast plus jasny
 * refleks pod literami; `aria-hidden`, bo to sygnatura, nie treść.
 */
export function AppCredit() {
  return (
    <p
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-3.5 z-0 text-center text-[10px] font-semibold tracking-[0.18em] uppercase select-none"
      style={{
        color: 'rgba(22, 24, 28, 0.34)',
        textShadow: '0 1px 0 rgba(255, 255, 255, 0.6)',
      }}
    >
      {pl.app.credit}
    </p>
  );
}
