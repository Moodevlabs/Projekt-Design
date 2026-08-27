import { useQuoteAcceptance, useQuoteComments } from '@/data/queries/useShares';

import { QuoteFeedbackCard } from './QuoteFeedbackCard';

/**
 * Co wróciło od klienta pod jedną wyceną — sam pobiera dane (T-26).
 *
 * Istnieje po to, żeby to samo dało się pokazać w kilku miejscach bez
 * przekazywania danych przez pół aplikacji: w oknie „Udostępnij", w prawej
 * kolumnie edytora i na karcie projektu.
 *
 * **Milczy, gdy nie ma nic do powiedzenia.** Karta akceptacji widoczna zawsze
 * — pusta, dopóki klient nie kliknie — zamieniłaby się w ozdobę i przestała
 * być zauważana dokładnie wtedy, gdy zaczyna coś znaczyć.
 */
export function QuoteFeedback({ quoteId }: { quoteId: string }) {
  const acceptance = useQuoteAcceptance(quoteId);
  const comments = useQuoteComments(quoteId);

  return (
    <QuoteFeedbackCard
      acceptance={acceptance.data ?? null}
      comments={comments.data ?? []}
      quoteId={quoteId}
    />
  );
}
