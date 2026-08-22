import { CreditCard } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function SubscriptionPage() {
  return (
    <EmptyState
      icon={CreditCard}
      title={pl.billing.title}
      description={`Status subskrypcji, płatność i faktury — ${pl.common.soon}.`}
    />
  );
}
