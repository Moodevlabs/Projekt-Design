import { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared';
import { useBriefs, useCreateBrief } from '@/data/queries/useBriefs';
import { buildBriefUrl, type BriefTemplate } from '@/domain/brief';
import { BriefRow } from './BriefRow';
import { NewBriefDialog } from './NewBriefDialog';
import { env } from '@/lib/env';
import { pl } from '@/i18n/pl';

/**
 * Zakładka „Brief" na karcie klienta (T-93, poprawka 9).
 *
 * ## Dlaczego u KLIENTA, a nie w projekcie
 *
 * Brief jest **pierwszym etapem współpracy** — wypełnia się go, zanim
 * powstanie teczka, bo dopiero z odpowiedzi wiadomo, co projektujemy. Teczka
 * bez briefu jest normalna; brief bez klienta nie ma sensu.
 *
 * ## Dlaczego lista, a nie jeden brief
 *
 * Klient wraca. Drugie mieszkanie, dom rodziców, lokal — za każdym razem inne
 * odpowiedzi. Jeden brief na klienta zmuszałby do nadpisywania historii tam,
 * gdzie właśnie historia jest wartościowa.
 */
export function ClientBriefTab({ clientId }: { clientId: string }) {
  const briefs = useBriefs(clientId);
  const create = useCreateBrief(clientId);
  const [newOpen, setNewOpen] = useState(false);

  const rows = briefs.data ?? [];

  const handleCreate = (input: { expiryDays: number | null; template: BriefTemplate }) => {
    create.mutate(input, {
      onSuccess: (brief) => {
        setNewOpen(false);
        // Link kopiujemy od razu: wystawienie briefu ma jeden cel — przekazać
        // adres klientowi — a szukanie go potem w liście jest krokiem, którego
        // nie musi być.
        const url = env.shareBaseUrl ? buildBriefUrl(env.shareBaseUrl, brief.token) : brief.token;
        void navigator.clipboard
          .writeText(url)
          .then(() => toast.success(pl.brief.copied))
          .catch(() => undefined);
      },
      onError: () => toast.error(pl.brief.createFailed),
    });
  };

  return (
    <div className="space-y-4">
      <section className="card-surface flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="max-w-prose min-w-0">
          <h2 className="text-ink text-sm font-semibold">{pl.brief.title}</h2>
          <p className="text-ink-soft mt-1 text-sm">{pl.brief.intro}</p>
        </div>
        <Button onClick={() => setNewOpen(true)} disabled={create.isPending}>
          <Send className="size-4" aria-hidden />
          {create.isPending ? pl.brief.creating : pl.brief.create}
        </Button>
      </section>

      <NewBriefDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        pending={create.isPending}
        onSubmit={handleCreate}
      />

      {briefs.isLoading ? (
        <Skeleton className="h-32 rounded-[var(--radius-card)]" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title={pl.brief.empty} description={pl.brief.intro} />
      ) : (
        <ul className="space-y-3">
          {rows.map((brief) => (
            <BriefRow key={brief.id} brief={brief} clientId={clientId} />
          ))}
        </ul>
      )}
    </div>
  );
}
