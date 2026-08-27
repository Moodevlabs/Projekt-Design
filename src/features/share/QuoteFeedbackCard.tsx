import type { Acceptance, QuoteComment } from '@/domain/share/schema';

import { AcceptanceBlock } from './AcceptanceBlock';
import { CommentsBlock } from './CommentsBlock';

/**
 * Co wróciło od klienta pod jedną wyceną: akceptacja i uwagi (T-26).
 *
 * Jedna **biała karta** z tych samych elementów co reszta aplikacji
 * (`card-surface`, oczka wersalikowe, włos jako separator) — nie kolorowy
 * alert. Akceptacja i uwagi to dwa akapity tej samej notatki, więc dzieli je
 * kreska, a nie drugie pudełko.
 *
 * Milczy, gdy nie ma nic do pokazania: pusta karta „brak akceptacji" byłaby
 * ozdobą, którą przestaje się zauważać dokładnie wtedy, gdy coś się w niej
 * pojawia.
 */
export function QuoteFeedbackCard({
  acceptance,
  comments,
  quoteId,
}: {
  acceptance: Acceptance | null;
  comments: QuoteComment[];
  quoteId: string;
}) {
  if (!acceptance && comments.length === 0) return null;

  return (
    <section className="card-surface p-5">
      {acceptance ? <AcceptanceBlock acceptance={acceptance} /> : null}

      {acceptance && comments.length > 0 ? (
        <div className="mt-4 border-t border-[var(--hair)] pt-4">
          <CommentsBlock comments={comments} quoteId={quoteId} />
        </div>
      ) : (
        <CommentsBlock comments={comments} quoteId={quoteId} />
      )}
    </section>
  );
}
