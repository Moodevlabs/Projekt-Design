import type { ReactNode } from 'react';
import { LogoLockup } from '@/assets/brand/LogoLockup';
import { pl } from '@/i18n/pl';

/**
 * Ekrany logowania nie mają sidebara — jedna karta na środku (05-UI §3).
 *
 * Skupiona poświata za kartą usunięta w T-76: istniała po to, żeby szklana
 * tafla miała co załamywać. Biała karta na ciepłej kanwie odcina się sama
 * jasnością, więc gradient byłby już tylko brudem pod krawędzią.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/*
        Pełny lockup — jedyne miejsce, gdzie stoi w całości (08-REDESIGN D-2).
        Nie ma pod nim `pl.app.name` ani `pl.app.tagline`: hasło „Tools for
        Atelier" jest już w krzywych wewnątrz logotypu, więc dopisanie go
        obok dałoby tagline dwa razy.

        Logotyp stoi POZA kolumną karty i jest od niej szerszy — dwa powody:
        1. Tagline „WEB STUDIO FOR YOUR ATELIER" jest w krzywych i ma ~5,6%
           wysokości lockupu. Przy poprzednim `h-20` wychodziło z tego 4,5 px,
           czyli nieczytelna mazia. Tutaj ma ~11 px i daje się przeczytać.
        2. Sam plik ma ~12% marginesu wbitego w `viewBox` (treść zaczyna się
           na x≈134 z 1080), więc szerokość ramki jest zawsze większa niż
           to, co widać. Rozmiar dobrany z zapasem na tę różnicę.

        Sterujemy SZEROKOŚCIĄ, nie wysokością: `w-full` pozwala logotypowi
        zwęzić się w wąskim oknie, zamiast wystawać poza ekran.
      */}
      <LogoLockup
        title={`${pl.app.name} — ${pl.app.tagline}`}
        className="text-brown mb-10 w-full max-w-[460px]"
      />

      <div className="relative w-full max-w-[380px]">
        <div className="card-surface p-7">
          <h1 className="font-display text-ink text-[19px]">
            {title}
          </h1>
          {description ? <p className="text-ink-soft mt-1.5 text-sm">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="text-ink-soft mt-5 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}
