import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntitlement } from './useEntitlement';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

/**
 * Pasek nad edytorem, gdy dostęp wygasł.
 *
 * Treść mówi wprost, że **wyceny dalej da się otworzyć i wyeksportować** —
 * to nie jest zakładnik danych, tylko brak prawa do dalszej pracy. Człowiek,
 * który nie zapłacił, i tak ma prawo wyjąć to, co zrobił.
 */
export function ReadOnlyBanner() {
  const entitlement = useEntitlement();

  // W trakcie ładowania nic nie pokazujemy: mignięcie „dostęp wygasł" przy
  // każdym starcie byłoby gorsze niż sekunda bez ostrzeżenia.
  if (entitlement.loading || entitlement.canWrite) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-hair-strong bg-danger-wash px-7 py-2.5">
      <Lock className="size-4 shrink-0 text-danger" aria-hidden />
      <p className="text-ink min-w-0 flex-1 text-[13px]">{pl.billing.readOnlyBanner}</p>
      <Button type="button" size="sm" asChild>
        <Link to={routes.subscription}>{pl.billing.buy}</Link>
      </Button>
    </div>
  );
}
