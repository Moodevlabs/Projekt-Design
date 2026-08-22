import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={SearchX}
      title={pl.errors.notFound}
      action={
        <Button asChild>
          <Link to={routes.dashboard}>{pl.nav.dashboard}</Link>
        </Button>
      }
    />
  );
}
