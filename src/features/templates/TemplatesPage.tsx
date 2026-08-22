import { LayoutTemplate } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function TemplatesPage() {
  return <EmptyState icon={LayoutTemplate} title={pl.templates.emptyTitle} description={pl.templates.emptyDescription} />;
}
