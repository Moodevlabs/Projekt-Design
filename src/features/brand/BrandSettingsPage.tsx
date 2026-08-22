import { Palette } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function BrandSettingsPage() {
  return (
    <EmptyState
      icon={Palette}
      title={pl.brand.title}
      description={`Logo, kolory, font i domyślne teksty do PDF — ${pl.common.soon}.`}
    />
  );
}
