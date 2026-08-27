import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { routes } from '@/app/routes';
import { useQuoteAcceptance, useQuoteComments } from '@/data/queries/useShares';
import { useQuotesList } from '@/data/queries/useQuotes';
import { formatDateTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/**
 * „Klient przyjął ofertę" na karcie projektu (T-26, wyprowadzone 2026-08-27).
 *
 * ## Po co osobny komponent
 *
 * Do 2026-08-27 fakt akceptacji żył **wyłącznie w oknie „Udostępnij"** — czyli
 * trzeba było wejść w wycenę, otworzyć modal i dopiero tam zobaczyć, że klient
 * podpisał. Projekt, na który patrzy się najczęściej, nie mówił o tym nic.
 *
 * Karta pokazuje **wynik**, nie mechanikę: kto przyjął, kiedy i czy zostawił
 * uwagi. Po szczegóły (linki, licznik otwarć) prowadzi odnośnik do wyceny.
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

  return (
    <section className="border-positive/30 bg-positive-wash rounded-[var(--radius-card)] border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-positive flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {pl.share.acceptedTitle}
          </h2>

          <p className="mt-1.5 text-sm">
            {acceptance.data.signerName
              ? pl.share.acceptedBy(acceptance.data.signerName)
              : pl.share.acceptedAnonymously}
            {' · '}
            {formatDateTime(acceptance.data.acceptedAt)}
          </p>

          <p className="text-ink-soft mt-0.5 text-sm">
            {quote.number ? `${quote.number} · ` : ''}
            {quote.title}
          </p>

          {unread > 0 ? (
            <p className="text-ink-soft mt-2 flex items-center gap-1.5 text-sm">
              <MessageSquare className="size-3.5 shrink-0" aria-hidden />
              {pl.share.unreadComments(unread)}
            </p>
          ) : null}
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link to={routes.quote(quote.id)}>
            {pl.share.openQuote}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
