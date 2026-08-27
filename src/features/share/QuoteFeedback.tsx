import { useQuoteAcceptance, useQuoteComments, useShares } from '@/data/queries/useShares';

import { DecisionPath } from './DecisionPath';
import { QuoteFeedbackCard } from './QuoteFeedbackCard';

/**
 * Co wróciło od klienta pod jedną wyceną — sam pobiera dane (T-26).
 *
 * ## Zmiana z 2026-08-27 (poprawka 7a)
 *
 * Do tej pory pokazywał kartę akceptacji i uwagi, i **milczał**, dopóki nic
 * nie wróciło. Milczenie było dobrą zasadą dla pojedynczej karty, ale złą dla
 * ścieżki: „nie wiadomo, czy klient w ogóle otworzył link" to jest właśnie ta
 * informacja, po którą się tu zagląda.
 *
 * Dlatego oś decyzji pokazuje się od chwili, gdy jest co śledzić — czyli gdy
 * istnieje link albo wycena została oznaczona jako wysłana. Wcześniej dalej
 * milczy: przed wysłaniem nie ma żadnej ścieżki.
 */
export function QuoteFeedback({ quoteId, sentAt }: { quoteId: string; sentAt: string | null }) {
  const acceptance = useQuoteAcceptance(quoteId);
  const comments = useQuoteComments(quoteId);
  const shares = useShares(quoteId);

  const shareRows = shares.data ?? [];
  const commentRows = comments.data ?? [];
  const hasPath = sentAt !== null || shareRows.length > 0 || acceptance.data !== null;

  return (
    <>
      {hasPath ? (
        <DecisionPath
          sentAt={sentAt}
          shares={shareRows}
          comments={commentRows}
          acceptance={acceptance.data ?? null}
        />
      ) : null}

      {/*
        Uwagi zostają OSOBNĄ kartą, a nie kolejnym krokiem osi: oś mówi, na
        czym stoimy, a uwagi trzeba przeczytać i odhaczyć. Wciśnięcie ich
        w wiersz ścieżki kazałoby rozwijać krok, żeby dowiedzieć się, co
        klient napisał.
      */}
      <QuoteFeedbackCard comments={commentRows} quoteId={quoteId} />
    </>
  );
}
