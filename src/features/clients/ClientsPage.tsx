import { Users } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function ClientsPage() {
  return (
    <EmptyState
      icon={Users}
      title={pl.nav.clients}
      description={`Lista klientów i historia wycen — ${pl.common.soon} (faza 2).`}
    />
  );
}
