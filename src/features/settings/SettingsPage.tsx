import { Settings } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function SettingsPage() {
  return (
    <EmptyState
      icon={Settings}
      title={pl.settings.title}
      description={`Waluta, VAT, wzorzec numeracji i konto — ${pl.common.soon}.`}
    />
  );
}
