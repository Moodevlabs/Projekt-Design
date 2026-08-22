import { Badge } from '@/components/ui/badge';
import type { QuoteStatus } from '@/domain/quote/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

const STYLES: Record<QuoteStatus, string> = {
  draft: 'bg-surface-2 text-ink-soft border-hair',
  sent: 'bg-[#EEF2FF] text-[#3949AB] border-transparent',
  accepted: 'bg-[#E7F4EC] text-positive border-transparent',
  rejected: 'bg-[#FBEAEA] text-danger border-transparent',
  expired: 'bg-[#FDF3E2] text-warning border-transparent',
};

export function StatusBadge({ status, className }: { status: QuoteStatus; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-[var(--radius-pill)] px-2.5 py-0.5 font-medium', STYLES[status], className)}
    >
      {pl.status[status]}
    </Badge>
  );
}
