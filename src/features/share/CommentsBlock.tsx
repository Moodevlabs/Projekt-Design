import { Button } from '@/components/ui/button';
import { useMarkCommentRead } from '@/data/queries/useShares';
import type { QuoteComment } from '@/domain/share/schema';
import { formatDate, formatTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Uwagi zostawione przez klienta pod ofertą (T-26).
 *
 * ## Jak oznaczamy nieprzeczytane
 *
 * **Nie pigułką.** Kolorowa plakietka „NOWE" przy każdej świeżej uwadze robi
 * z listy choinkę, a przy dwóch wpisach jest po prostu szumem. Stan niosą
 * tutaj dwa kanały, oba strukturalne:
 *
 *  - **kropka** przy nazwisku — obecna albo nie;
 *  - **jasność tekstu** — przeczytane schodzą w `--ink-soft`.
 *
 * Ta sama zasada co w `StatusMark`: barwa wzmacnia, ale nie jest jedynym
 * nośnikiem. Kto nie odróżnia odcieni, i tak widzi kropkę oraz przycisk
 * „Oznacz jako przeczytane", który przy przeczytanych znika.
 */
export function CommentsBlock({
  comments,
  quoteId,
}: {
  comments: QuoteComment[];
  quoteId: string;
}) {
  const markRead = useMarkCommentRead(quoteId);
  if (comments.length === 0) return null;

  const unread = comments.filter((row) => row.readAt === null).length;

  return (
    <div>
      <p className="label-caps text-ink-soft">
        {unread > 0 ? pl.share.commentsWithUnread(comments.length, unread) : pl.share.comments}
      </p>

      <ul className="mt-3 flex flex-col">
        {comments.map((comment, index) => {
          const isUnread = comment.readAt === null;

          return (
            <li
              key={comment.id}
              className={cn(
                'py-3',
                index > 0 && 'border-t border-[var(--hair)]',
                index === 0 && 'pt-0',
              )}
            >
              <div className="flex items-baseline gap-2">
                {/* Kropka zamiast plakietki — obecna albo nie, bez napisu. */}
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
                    isUnread ? 'bg-[var(--status-sent)]' : 'bg-transparent',
                  )}
                />
                <span
                  className={cn('text-[13px]', isUnread ? 'text-ink font-medium' : 'text-ink-soft')}
                >
                  {comment.authorName ?? pl.share.anonymous}
                </span>
                <span className="text-ink-faint tabular ml-auto text-[12px]">
                  {formatDate(comment.createdAt)}, {formatTime(comment.createdAt)}
                </span>
              </div>

              <p
                className={cn(
                  'mt-1 pl-3.5 text-[13px] leading-relaxed whitespace-pre-line',
                  isUnread ? 'text-ink' : 'text-ink-soft',
                )}
              >
                {comment.message}
              </p>

              {isUnread ? (
                <div className="mt-1 pl-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-1.5 text-[12px]"
                    onClick={() => markRead.mutate(comment.id)}
                  >
                    {pl.share.markRead}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
