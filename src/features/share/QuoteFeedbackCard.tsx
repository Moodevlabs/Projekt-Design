import type { QuoteComment } from '@/domain/share/schema';

import { CommentsBlock } from './CommentsBlock';

/**
 * Uwagi klienta pod jedną wyceną (T-26).
 *
 * Jedna **biała karta** z tych samych elementów co reszta aplikacji
 * (`card-surface`, oczka wersalikowe, włos jako separator) — nie kolorowy
 * alert.
 *
 * Od 2026-08-27 (poprawka 7a) akceptacja przeniosła się stąd do
 * `DecisionPath`: fakt „klient przyjął ofertę" jest krokiem ścieżki, a nie
 * osobnym pudełkiem obok niej. Tutaj zostają same uwagi, bo te się czyta
 * i odhacza — a to inna czynność niż spojrzenie na stan sprawy.
 *
 * Milczy, gdy nie ma nic do pokazania: pusta karta „brak uwag" byłaby ozdobą,
 * którą przestaje się zauważać dokładnie wtedy, gdy coś się w niej pojawia.
 */
export function QuoteFeedbackCard({
  comments,
  quoteId,
}: {
  comments: QuoteComment[];
  quoteId: string;
}) {
  if (comments.length === 0) return null;

  return (
    <section className="card-surface p-5">
      <CommentsBlock comments={comments} quoteId={quoteId} />
    </section>
  );
}
