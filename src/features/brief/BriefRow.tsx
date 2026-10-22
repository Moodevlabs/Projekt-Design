import { useState } from 'react';
import { Copy, FileText, Mail, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared';
import { useDeleteBrief, useRevokeBrief } from '@/data/queries/useBriefs';
import { buildBriefUrl, countAnswered, countQuestions, type Brief } from '@/domain/brief';
import { env } from '@/lib/env';
import { openExternal } from '@/lib/tauri';
import { formatDate, formatDateTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import { BriefAnswers } from './BriefAnswers';
import { BriefProposalSheet } from './ai/BriefProposalSheet';

/**
 * Wiersz briefu na liście klienta (wydzielony z `ClientBriefTab` w T-137).
 *
 * Wypełniony brief (`submittedAt`) dostaje dodatkowo „Zaproponuj wycenę
 * (AI)" — wejście do arkusza z propozycją pomieszczeń i zakresu. Brief
 * w trakcie wypełniania go nie ma: asystent czytałby połowę odpowiedzi.
 */
export function BriefRow({ brief, clientId }: { brief: Brief; clientId: string }) {
  const revoke = useRevokeBrief(clientId);
  const remove = useDeleteBrief(clientId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);

  const url = env.shareBaseUrl ? buildBriefUrl(env.shareBaseUrl, brief.token) : brief.token;
  const total = countQuestions(brief.template);
  const answered = countAnswered(brief.template, brief.answers);

  const expired = brief.expiresAt !== null && new Date(brief.expiresAt) <= new Date();
  const dead = brief.revokedAt !== null || expired;
  const submitted = brief.submittedAt !== null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(pl.brief.copied);
    } catch {
      toast.error(pl.brief.copyFailed);
    }
  };

  const sendMail = () => {
    // `mailto:` otwiera pocztę PROJEKTANTA — brief ma przyjść do klienta od
    // człowieka, z którym rozmawia, tak samo jak oferta (docs/IDEAS.md).
    void openExternal(
      `mailto:?subject=${encodeURIComponent(pl.brief.mailSubject)}&body=${encodeURIComponent(
        pl.brief.mailBody(url),
      )}`,
    );
  };

  return (
    <li className={cn('card-surface p-5', dead && 'opacity-70')}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium">
            {brief.revokedAt !== null
              ? pl.brief.revoked
              : expired
                ? pl.brief.expired
                : submitted
                  ? pl.brief.open
                  : pl.brief.waiting}
          </p>
          <p className="text-ink-soft text-xs">
            {brief.viewCount === 0 ? pl.brief.neverOpened : pl.brief.openedTimes(brief.viewCount)}
            {brief.submittedAt
              ? ` · ${pl.brief.submittedOn(formatDateTime(brief.submittedAt))}`
              : ''}
          </p>
        </div>

        <p className="text-ink-soft tabular text-xs">
          {total > 0 ? pl.brief.progress(answered, total) : pl.brief.noAnswerYet}
        </p>
      </div>

      {/*
        Pasek postępu jest tu **jedyną liczbą, która coś zmienia**: mówi, czy
        warto już czytać odpowiedzi, czy klient dopiero zaczął.
      */}
      {total > 0 ? (
        <div className="border-hair bg-surface-2 mt-3 h-1.5 overflow-hidden rounded-[var(--radius-pill)] border">
          <span
            className="block h-full"
            style={{
              width: `${Math.round((answered / total) * 100)}%`,
              background: 'var(--status-accepted)',
            }}
          />
        </div>
      ) : null}

      {!dead ? (
        <input
          readOnly
          value={url}
          aria-label={pl.brief.linkLabel}
          onFocus={(event) => event.currentTarget.select()}
          className="border-hair bg-surface-2 text-ink-soft mt-3 w-full rounded-[var(--radius-control)] border px-2 py-1.5 font-mono text-xs"
        />
      ) : null}

      <div className="text-ink-faint mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>{formatDate(brief.createdAt)}</span>
        {brief.expiresAt ? (
          <span>{`${pl.brief.validFor}: ${formatDate(brief.expiresAt)}`}</span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!dead ? (
          <>
            <Button size="sm" onClick={() => void copy()}>
              <Copy className="size-4" aria-hidden />
              {pl.brief.copy}
            </Button>
            <Button size="sm" variant="outline" onClick={sendMail}>
              <Mail className="size-4" aria-hidden />
              {pl.brief.sendByMail}
            </Button>
          </>
        ) : null}

        {submitted ? (
          <Button size="sm" variant="outline" onClick={() => setProposalOpen(true)}>
            <Sparkles className="size-4" aria-hidden />
            {pl.ai.brief.action}
          </Button>
        ) : null}

        {answered > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => setAnswersOpen((open) => !open)}>
            <FileText className="size-4" aria-hidden />
            {pl.brief.answersTitle}
          </Button>
        ) : null}

        {!dead ? (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => revoke.mutate(brief.id)}
          >
            {pl.brief.revoke}
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          aria-label={pl.brief.delete}
          className={dead ? 'ml-auto' : undefined}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      {answersOpen ? <BriefAnswers brief={brief} /> : null}

      {/*
        Arkusz montuje się dopiero po kliknięciu (jak dialog w `CommentAiAction`):
        zamontowany na stałe pytałby o bibliotekę, szablony i limit asystenta
        dla każdego wiersza briefu na liście, także zamknięty.
      */}
      {submitted && proposalOpen ? (
        <BriefProposalSheet brief={brief} open={proposalOpen} onOpenChange={setProposalOpen} />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={pl.brief.delete}
        description={pl.brief.deleteConfirm}
        confirmLabel={pl.common.delete}
        destructive
        onConfirm={() => remove.mutate(brief.id)}
      />
    </li>
  );
}
