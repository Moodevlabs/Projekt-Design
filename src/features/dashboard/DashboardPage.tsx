import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState, Money, PageSection } from '@/components/shared';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';

const STATS = [
  { label: pl.dashboard.quotesThisMonth, value: '—' },
  { label: pl.dashboard.sentValue, value: null },
  { label: pl.dashboard.acceptanceRate, value: '—' },
  { label: pl.dashboard.averageValue, value: null },
] as const;

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="card-surface p-5">
            <p className="text-ink-soft text-xs font-medium">{stat.label}</p>
            <p className="text-ink mt-2 text-2xl font-semibold tracking-tight">
              {stat.value ?? <Money cents={0} />}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <PageSection
          title={pl.dashboard.recentQuotes}
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link to={routes.quotes}>{pl.common.all}</Link>
            </Button>
          }
        >
          <EmptyState
            icon={FileText}
            title={pl.quotes.emptyTitle}
            description={pl.quotes.emptyDescription}
            className="shadow-none"
            action={
              <Button asChild>
                <Link to={routes.quoteNew}>
                  <Plus className="size-4" aria-hidden />
                  {pl.quotes.new}
                </Link>
              </Button>
            }
          />
        </PageSection>

        <PageSection title={pl.billing.title}>
          <p className="text-ink-soft text-sm">{pl.billing.trial}</p>
          <Progress value={0} className="mt-3" />
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to={routes.subscription}>{pl.billing.manage}</Link>
          </Button>
        </PageSection>
      </div>
    </div>
  );
}
