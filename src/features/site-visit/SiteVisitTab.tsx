import { useState } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { useCreateSiteVisit, useSiteVisits } from '@/data/queries/useSiteVisits';
import { SiteVisitCard } from './SiteVisitCard';
import { pl } from '@/i18n/pl';

/**
 * Zakładka „Wizja lokalna" w teczce projektu (T-94, poprawka 10).
 *
 * ## Dlaczego lista, a nie jeden formularz
 *
 * Wizji bywa kilka: pierwsza przed projektem, druga po wyburzeniach, trzecia
 * przed montażem. Każda opisuje **inny stan tego samego wnętrza** —
 * nadpisywanie jednej drugą kasowałoby dokładnie to, po co się je robi.
 *
 * ## Dlaczego w projekcie, a nie u klienta
 *
 * Wizja dotyczy MIEJSCA. Ten sam klient może mieć dwie inwestycje w dwóch
 * miastach, a obmiar jednej nie mówi nic o drugiej.
 */
export function SiteVisitTab({ clientId, projectId }: { clientId: string; projectId: string }) {
  const visits = useSiteVisits(projectId);
  const create = useCreateSiteVisit(projectId);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = visits.data ?? [];

  const handleAdd = () => {
    // Data dzisiejsza jako punkt wyjścia: wizję spisuje się zwykle tego
    // samego wieczoru, a datę i tak da się poprawić w karcie.
    const today = new Date().toISOString().slice(0, 10);
    create.mutate(today, {
      onSuccess: (visit) => setOpenId(visit.id),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="space-y-4">
      <section className="card-surface flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0 max-w-prose">
          <h2 className="text-ink text-sm font-semibold">{pl.siteVisit.title}</h2>
          <p className="text-ink-soft mt-1 text-sm">{pl.siteVisit.intro}</p>
        </div>
        <Button onClick={handleAdd} disabled={create.isPending}>
          <Plus className="size-4" aria-hidden />
          {pl.siteVisit.add}
        </Button>
      </section>

      {visits.isLoading ? (
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={pl.siteVisit.empty}
          description={pl.siteVisit.emptyHint}
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((visit) => (
            <li key={visit.id}>
              <SiteVisitCard
                visit={visit}
                clientId={clientId}
                projectId={projectId}
                open={openId === visit.id}
                onToggle={() => setOpenId((current) => (current === visit.id ? null : visit.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
