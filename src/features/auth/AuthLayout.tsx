import type { ReactNode } from 'react';
import { pl } from '@/i18n/pl';

/** Ekrany logowania nie mają sidebara — jedna karta na środku (05-UI §3). */
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
    <div className="bg-canvas flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-full text-base font-semibold">
            A
          </div>
          <p className="text-ink-soft text-sm">{pl.app.tagline}</p>
        </div>

        <div className="card-surface p-7">
          <h1 className="text-ink text-lg font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-ink-soft mt-1.5 text-sm">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <div className="text-ink-soft mt-5 text-center text-sm">{footer}</div> : null}
      </div>
    </div>
  );
}
