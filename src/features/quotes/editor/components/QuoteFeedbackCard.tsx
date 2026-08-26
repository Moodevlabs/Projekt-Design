import { CheckCircle2, MessageSquare } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMarkCommentRead } from '@/data/queries/useShares';
import { parseQuoteBody } from '@/domain/quote/schema';
import { selectionDiff, type Acceptance, type QuoteComment } from '@/domain/share/schema';
import { formatDateTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';

interface Props {
  acceptance: Acceptance | null;
  comments: QuoteComment[];
  quoteId: string;
}

/**
 * Co wrócilo od klienta: akceptacja i uwagi (T-26).
 *
 * Świadomie w jednym miejscu z linkami: projektant, który otwiera
 * „Udostępnij", zwykle chce sprawdzić, czy coś się wydarzyło — a nie
 * wygenerować kolejny link.
 */
export function QuoteFeedbackCard({ acceptance, comments, quoteId }: Props) {
  const markRead = useMarkCommentRead(quoteId);

  if (!acceptance && comments.length === 0) return null;

  return (
    <div className="space-y-3">
      {acceptance ? <AcceptanceBlock acceptance={acceptance} /> : null}

      {comments.length > 0 ? (
        <div className="border-hair-strong rounded-[var(--radius-control)] border p-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="size-4" aria-hidden />
            {pl.share.comments}
          </h3>
          <ul className="mt-2 space-y-2">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="border-hair border-t pt-2 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.authorName ?? pl.share.anonymous}
                  </span>
                  {comment.readAt === null ? (
                    <span className="bg-primary text-primary-foreground rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-medium">
                      {pl.share.unread}
                    </span>
                  ) : null}
                  <span className="text-ink-faint ml-auto text-xs">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm whitespace-pre-line">{comment.message}</p>
                {comment.readAt === null ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 -ml-2"
                    onClick={() => markRead.mutate(comment.id)}
                  >
                    {pl.share.markRead}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AcceptanceBlock({ acceptance }: { acceptance: Acceptance }) {
  // `acceptedBody` to snapshot z serwera, a `enabledItemIds` — wybór klienta.
  // Różnica między nimi to jedyna rzecz, którą projektant naprawdę chce
  // zobaczyć: co inwestor wyłączył, a co dobrał.
  const parsed = parseQuoteBody(acceptance.acceptedBody);
  const diff = parsed.ok ? selectionDiff(parsed.body, acceptance.enabledItemIds) : null;

  return (
    <div className="border-positive/30 bg-positive-wash rounded-[var(--radius-control)] border p-3">
      <h3 className="text-positive flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 className="size-4" aria-hidden />
        {pl.share.acceptedTitle}
      </h3>
      <p className="mt-1 text-sm">
        {acceptance.signerName ? pl.share.acceptedBy(acceptance.signerName) : null}
        {acceptance.signerName ? ' · ' : ''}
        {formatDateTime(acceptance.acceptedAt)}
      </p>
      {diff ? (
        <p className="text-ink-soft mt-1 text-xs">
          {diff.turnedOff.length === 0 && diff.turnedOn.length === 0
            ? pl.share.noChanges
            : [
                diff.turnedOff.length > 0 ? pl.share.turnedOff(diff.turnedOff.length) : null,
                diff.turnedOn.length > 0 ? pl.share.turnedOn(diff.turnedOn.length) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
