import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppCredit } from '@/app/AppCredit';
import { registerDeepLinks } from '@/app/deep-links';
import { routes } from '@/app/routes';

/** Korzeń drzewa tras — miejsce na rzeczy globalne wymagające routera. */
export function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    let unregister: (() => void) | undefined;
    let cancelled = false;

    void registerDeepLinks({
      onRecovery: () => void navigate(routes.newPassword, { replace: true }),
    }).then((off) => {
      if (cancelled) off();
      else unregister = off;
    });

    return () => {
      cancelled = true;
      unregister?.();
    };
  }, [navigate]);

  // Podpis renderujemy PRZED treścią, żeby panele rysowały się nad nim.
  return (
    <>
      <AppCredit />
      <Outlet />
    </>
  );
}
