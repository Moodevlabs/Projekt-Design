import type { ReactNode } from 'react';
import { pl } from '@/i18n/pl';

/**
 * Ekrany logowania nie mają sidebara — jedna tafla na środku (05-UI §3).
 *
 * Pole światła z `body` sięga tylko rogów ekranu, więc karta stojąca pośrodku
 * nie miałaby czego załamywać i wyszłaby płaskim białym prostokątem. Dlatego
 * ten widok dokłada własną, skupioną poświatę dokładnie za kartą.
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
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'radial-gradient(closest-side, var(--canvas-light), transparent)',
        }}
      />

      <div className="relative w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3.5">
          <span className="bg-cta text-cta-fg font-display flex size-12 items-center justify-center rounded-full text-lg font-semibold shadow-[0_8px_24px_-8px_rgba(20,22,28,0.6)]">
            A
          </span>
          <div className="text-center">
            <p className="font-display text-ink text-[22px] leading-none font-semibold tracking-[-0.02em]">
              {pl.app.name}
            </p>
            <p className="text-ink-soft mt-2 text-[13px]">{pl.app.tagline}</p>
          </div>
        </div>

        <div className="card-surface glass-strong p-7">
          <h1 className="font-display text-ink text-[19px] font-semibold tracking-[-0.01em]">
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
