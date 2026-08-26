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
    <div className="relative flex min-h-full items-center justify-center overflow-hidden p-6">
      <div className="relative w-full max-w-[380px]">
        {/*
          Pełny lockup — jedyne miejsce, gdzie stoi w całości (08-REDESIGN D-2).
          Nie ma pod nim `pl.app.name` ani `pl.app.tagline`: hasło „Tools for
          Atelier" jest już w krzywych wewnątrz logotypu, więc dopisanie go
          obok dałoby tagline dwa razy.
        */}
        <div className="mb-8 flex justify-center">
          <LogoLockup title={`${pl.app.name} — ${pl.app.tagline}`} className="text-brown h-20 w-auto" />
        </div>

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
