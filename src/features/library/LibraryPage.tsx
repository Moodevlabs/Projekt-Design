import { Library } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function LibraryPage() {
  return <EmptyState icon={Library} title={pl.library.emptyTitle} description={pl.library.emptyDescription} />;
}
