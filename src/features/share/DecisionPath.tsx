import { Check, Circle, MessageSquare, Send, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { parseQuoteBody } from '@/domain/quote/schema';
import { selectionDiffNames, type Acceptance, type Share } from '@/domain/share/schema';
import type { QuoteComment } from '@/domain/share/schema';
import { formatDate, formatTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Stan jednego kroku ścieżki. */
type StepState = 'done' | 'pending' | 'rejected';

interface Step {
  key: string;
  icon: LucideIcon;
  state: StepState;
  title: string;
  /** Data zdarzenia — `null`, gdy jeszcze się nie wydarzyło. */
  at?: string | null;
  hint?: string | null;
}

/**
 * Ścieżka decyzji klienta (poprawka 7a, 2026-08-27).
 *
 * ## Problem
 *
 * O tym, co dzieje się z ofertą, mówiły trzy rozsypane elementy: pigułka
 * statusu w pasku, wiersz „otwarty 4 razy" w oknie udostępniania i karta
 * akceptacji w prawej kolumnie. Każdy z nich był prawdziwy i żaden nie
 * odpowiadał na pytanie, które projektant zadaje naprawdę: **na czym stoimy
 * i czy to na mnie się teraz czeka.**
 *
 * ## Rozwiązanie
 *
 * Jedna oś, cztery kroki, zawsze w tej samej kolejności: wysłano → otwarto →
 * uwagi → decyzja. Kroki, które jeszcze nie zaszły, **zostają na liście**
 * wyszarzone. To jest sedno: lista pokazująca tylko to, co się stało, nie
 * mówi, na co się czeka.
 *
 * Odmowa nie jest „porażką" pokolorowaną na czerwono — to zamknięcie sprawy
 * i wygląda jak zamknięcie: krzyżyk w tonie stonowanym, bez alarmu.
 */
export function DecisionPath({
  sentAt,
  shares,
  comments,
  acceptance,
}: {
  /** `quotes.sent_at` — moment, w którym oferta poszła do klienta. */
  sentAt: string | null;
  shares: Share[];
  comments: QuoteComment[];
  acceptance: Acceptance | null;
}) {
  // Pierwsze otwarcie liczy się z NAJWCZEŚNIEJSZEGO linku, nie z ostatniego:
  // wystawienie drugiego linku nie cofa faktu, że klient już ofertę widział.
  const firstViewedAt = shares
    .map((share) => share.firstViewedAt)
    .filter((value): value is string => value !== null)
    .sort()[0];

  const linkExists = shares.some((share) => share.revokedAt === null);
  const sent = sentAt !== null || linkExists;
  const opened = Boolean(firstViewedAt);
  const rejected = acceptance?.decision === 'rejected';

  const steps: Step[] = [
    {
      key: 'sent',
      icon: Send,
      state: sent ? 'done' : 'pending',
      title: sent ? pl.share.pathSent : pl.share.pathSentPending,
      at: sentAt,
      hint: sent ? null : pl.share.pathSentHint,
    },
    {
      key: 'opened',
      icon: Circle,
      state: opened ? 'done' : 'pending',
      title: opened ? pl.share.pathOpened : pl.share.pathOpenedPending,
      at: firstViewedAt ?? null,
      hint: opened ? null : pl.share.pathOpenedHint,
    },
    {
      key: 'comments',
      icon: MessageSquare,
      state: comments.length > 0 ? 'done' : 'pending',
      title:
        comments.length > 0 ? pl.share.pathComments(comments.length) : pl.share.pathCommentsNone,
      at: comments[0]?.createdAt ?? null,
    },
    acceptance
      ? {
          key: 'decision',
          icon: rejected ? X : Check,
          state: rejected ? 'rejected' : 'done',
          title: rejected ? pl.share.pathRejected : pl.share.pathAccepted,
          at: acceptance.acceptedAt,
          hint: rejected
            ? acceptance.reason
              ? pl.share.pathRejectedReason(acceptance.reason)
              : pl.share.pathNoReason
            : null,
        }
      : {
          key: 'decision',
          icon: Circle,
          state: 'pending',
          title: pl.share.pathDecisionPending,
          at: null,
          hint: pl.share.pathDecisionPendingHint,
        },
  ];

  return (
    <section className="card-surface p-5">
      <h2 className="label-caps text-ink-soft">{pl.share.pathTitle}</h2>

      <ol className="mt-3">
        {steps.map((step, index) => (
          <StepRow key={step.key} step={step} last={index === steps.length - 1} />
        ))}
      </ol>

      {acceptance ? <SelectionChanges acceptance={acceptance} /> : null}

      <p className="text-ink-faint mt-4 border-t border-[var(--hair)] pt-3 text-[12px] leading-relaxed">
        {pl.share.pathManualNote}
      </p>
    </section>
  );
}

function StepRow({ step, last }: { step: Step; last: boolean }) {
  const Icon = step.icon;
  const done = step.state !== 'pending';

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full border',
            step.state === 'done'
              ? 'border-transparent text-white'
              : step.state === 'rejected'
                ? 'border-transparent text-white'
                : 'border-hair text-ink-faint',
          )}
          style={
            step.state === 'done'
              ? { background: 'var(--status-accepted)' }
              : step.state === 'rejected'
                ? { background: 'var(--status-rejected)' }
                : undefined
          }
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        {/*
          Kreska łącząca kroki. Bez niej cztery kółka to lista wypunktowana,
          a nie droga — a to droga jest tu treścią.
        */}
        {last ? null : <span className="bg-hair w-px flex-1" aria-hidden />}
      </div>

      <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
        <p className={cn('text-sm', done ? 'text-ink' : 'text-ink-soft')}>{step.title}</p>
        {step.at ? (
          <p className="text-ink-soft tabular text-xs">
            {`${formatDate(step.at)} · ${formatTime(step.at)}`}
          </p>
        ) : null}
        {step.hint ? <p className="text-ink-faint text-xs">{step.hint}</p> : null}
      </div>
    </li>
  );
}

/**
 * Co klient zmienił w zakresie — **nazwami**, nie liczbą.
 *
 * „Klient wyłączył 3 pozycje" nie daje się na niczym oprzeć. Nazwy tak:
 * to od nich zaczyna się telefon do klienta.
 */
function SelectionChanges({ acceptance }: { acceptance: Acceptance }) {
  const parsed = parseQuoteBody(acceptance.acceptedBody);
  if (!parsed.ok) return null;

  const diff = selectionDiffNames(parsed.body, acceptance.enabledItemIds);
  if (diff.turnedOff.length === 0 && diff.turnedOn.length === 0) {
    return (
      <p className="text-ink-soft mt-4 border-t border-[var(--hair)] pt-3 text-[13px]">
        {pl.share.noChanges}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--hair)] pt-3">
      {diff.turnedOff.length > 0 ? (
        <NameList title={pl.share.turnedOffTitle} names={diff.turnedOff} tone="off" />
      ) : null}
      {diff.turnedOn.length > 0 ? (
        <NameList title={pl.share.turnedOnTitle} names={diff.turnedOn} tone="on" />
      ) : null}
    </div>
  );
}

function NameList({
  title,
  names,
  tone,
}: {
  title: string;
  names: string[];
  tone: 'off' | 'on';
}) {
  return (
    <div>
      <p className="label-caps text-ink-soft">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {names.map((name, index) => (
          <li key={`${name}-${index}`} className="flex items-baseline gap-2 text-[13px]">
            <span
              aria-hidden
              className="mt-[6px] size-1.5 shrink-0 rounded-full"
              style={{
                background:
                  tone === 'off' ? 'var(--status-rejected)' : 'var(--status-accepted)',
              }}
            />
            <span className={tone === 'off' ? 'text-ink-soft line-through' : 'text-ink'}>
              {name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
