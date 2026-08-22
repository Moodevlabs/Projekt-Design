import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Brama do części zalogowanej. Dopóki nie wiemy, czy jest sesja (odczyt
 * keychaina jest asynchroniczny), pokazujemy szkielet — bez tego mignąłby
 * ekran logowania przy każdym starcie aplikacji.
 */
export function AuthGate() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'unconfigured') {
    return (
      <div className="bg-canvas flex min-h-full items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>{pl.errors.notConfigured}</AlertTitle>
          <AlertDescription>
            Skopiuj <code>.env.example</code> do <code>.env</code> i uzupełnij adres projektu
            Supabase oraz klucz anon.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="bg-canvas flex h-full">
        <div className="border-hair bg-surface w-[72px] shrink-0 border-r p-4">
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="flex-1 p-7">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-6 h-40 w-full rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    // `state.from` pozwoli wrócić tam, gdzie użytkownik chciał wejść.
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
