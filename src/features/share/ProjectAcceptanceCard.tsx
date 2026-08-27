import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { routes } from '@/app/routes';
import { useQuoteAcceptance, useQuoteComments } from '@/data/queries/useShares';
import { useQuotesList } from '@/data/queries/useQuotes';
import { pl } from '@/i18n/pl';

import { AcceptanceBlock } from './AcceptanceBlock';

/**
 * „Klient przyjął ofertę" na karcie projektu (T-26, wyprowadzone 2026-08-27).
 *
 * ## Po co osobny komponent
 *
 * Do 2026-08-27 fakt akceptacji żył **wyłącznie w oknie „Udostępnij"** — czyli
 * trzeba było wejść w wycenę, otworzyć modal i dopiero tam zobaczyć, że klient
 * podpisał. Projekt, na który patrzy się najczęściej, nie mówił o tym nic.
 *
 * Wygląd jest ten sam co w edytorze i w oknie udostępniania (`AcceptanceBlock`)
 * — ta sama informacja ma wyglądać tak samo niezależnie od miejsca. Różnica to
 * dwie rzeczy, których nie ma sensu pokazywać przy otwartej wycenie: **której**
 * wyceny dotyczy i odnośnik do niej.
 *
 * ## Czemu tylko jedna wycena
 *
 * W projekcie **jedna** wycena może być zaakceptowana (reguła z PRD §4.0).
 * Bierzemy więc pierwszą ze statusem `accepted` — nie ma sensu szukać dalej.
 */
export function ProjectAcceptanceCard({ projectId }: { projectId: string }) {
  const accepted = useQuotesList({ projectId, status: 'accepted' });
  const quote = accepted.data?.[0];

  const acceptance = useQuoteAcceptance(quote?.id);
  const comments = useQuoteComments(quote?.id);

  // Status `accepted` bez wpisu akceptacji znaczy, że projektant oznaczył
  // wycenę ręcznie. To prawidłowy stan, ale nie „klient podpisał" — i nie ma
  // powodu, żeby karta o kimś takim opowiadała.
  if (!quote || !acceptance.data) return null;

  const unread = (comments.data ?? []).filter((row) => row.readAt === null).length;
  const quoteLabel = [quote.number, quote.title].filter(Boolean).join(' · ');

  return (
    <section className="card-surface p-5">
      <AcceptanceBlock
        acceptance={acceptance.data}
        quoteLabel={quoteLabel}
        action={
          <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 shrink-0">
            <Link to={routes.quote(quote.id)}>
              {pl.share.openQuote}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        }
      />

      {/*
        Same uwagi zostają w wycenie — tutaj wystarczy, że są. Przeniesienie
        ich treści na kartę projektu dałoby dwa miejsca do odhaczania tego
        samego i dwa, które trzeba pamiętać, żeby zsynchronizować.
      */}
      {unread > 0 ? (
        <p className="text-ink-soft mt-4 flex items-center gap-2 border-t border-[var(--hair)] pt-4 text-[13px]">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: 'var(--status-sent)' }}
          />
          {pl.share.unreadComments(unread)}
        </p>
      ) : null}
    </section>
  );
}
