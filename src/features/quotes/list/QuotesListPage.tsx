import { FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared';
import { pl } from '@/i18n/pl';

export function QuotesListPage() {
  return <EmptyState icon={FileText} title={pl.quotes.emptyTitle} description={pl.quotes.emptyDescription} />;
}
