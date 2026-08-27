import { useState } from 'react';
import { Copy, FileText, Mail, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog, EmptyState } from '@/components/shared';
import {
  useBriefs,
  useCreateBrief,
  useDeleteBrief,
  useRevokeBrief,
} from '@/data/queries/useBriefs';
import {
  buildBriefUrl,
  countAnswered,
  countQuestions,
  type Brief,
  type BriefTemplate,
} from '@/domain/brief';
import { NewBriefDialog } from './NewBriefDialog';
import { env } from '@/lib/env';
import { openExternal } from '@/lib/tauri';
import { formatDate, formatDateTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Zakładka „Brief" na karcie klienta (T-93, poprawka 9).
 *
 * ## Dlaczego u KLIENTA, a nie w projekcie
 *
 * Brief jest **pierwszym etapem współpracy** — wypełnia się go, zanim
 * powstanie teczka, bo dopiero z odpowiedzi wiadomo, co projektujemy. Teczka
 * bez briefu jest normalna; brief bez klienta nie ma sensu.
 *
 * ## Dlaczego lista, a nie jeden brief
 *
 * Klient wraca. Drugie mieszkanie, dom rodziców, lokal — za każdym razem inne
 * odpowiedzi. Jeden brief na klienta zmuszałby do nadpisywania historii tam,
 * gdzie właśnie historia jest wartościowa.
 */
export function ClientBriefTab({ clientId }: { clientId: string }) {
  const briefs = useBriefs(clientId);
  const create = useCreateBrief(clientId);
  const [newOpen, setNewOpen] = useState(false);

  const rows = briefs.data ?? [];

  const handleCreate = (input: { expiryDays: number | null; template: BriefTemplate }) => {
    create.mutate(input, {
      onSuccess: (brief) => {
        setNewOpen(false);
        // Link kopiujemy od razu: wystawienie briefu ma jeden cel — przekazać
        // adres klientowi — a szukanie go potem w liście jest krokiem, którego
        // nie musi być.
        const url = env.shareBaseUrl ? buildBriefUrl(env.shareBaseUrl, brief.token) : brief.token;
        void navigator.clipboard
          .writeText(url)
          .then(() => toast.success(pl.brief.copied))
          .catch(() => undefined);
      },
      onError: () => toast.error(pl.brief.createFailed),
    });
  };

  return (
    <div className="space-y-4">
      <section className="card-surface flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="max-w-prose min-w-0">
          <h2 className="text-ink text-sm font-semibold">{pl.brief.title}</h2>
          <p className="text-ink-soft mt-1 text-sm">{pl.brief.intro}</p>
        </div>
        <Button onClick={() => setNewOpen(true)} disabled={create.isPending}>
          <Send className="size-4" aria-hidden />
          {create.isPending ? pl.brief.creating : pl.brief.create}
        </Button>
      </section>

      <NewBriefDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        pending={create.isPending}
        onSubmit={handleCreate}
      />

      {briefs.isLoading ? (
        <Skeleton className="h-32 rounded-[var(--radius-card)]" />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title={pl.brief.empty} description={pl.brief.intro} />
      ) : (
        <ul className="space-y-3">
          {rows.map((brief) => (
            <BriefRow key={brief.id} brief={brief} clientId={clientId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BriefRow({ brief, clientId }: { brief: Brief; clientId: string }) {
  const revoke = useRevokeBrief(clientId);
  const remove = useDeleteBrief(clientId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [answersOpen, setAnswersOpen] = useState(false);

  const url = env.shareBaseUrl ? buildBriefUrl(env.shareBaseUrl, brief.token) : brief.token;
  const total = countQuestions(brief.template);
  const answered = countAnswered(brief.template, brief.answers);

  const expired = brief.expiresAt !== null && new Date(brief.expiresAt) <= new Date();
  const dead = brief.revokedAt !== null || expired;

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
                : brief.submittedAt
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

/**
 * Odpowiedzi w układzie dokumentu, nie tabeli.
 *
 * Pytania **bez odpowiedzi pomijamy**: brief wypełnia się na raty i lista
 * dwudziestu pustych pól przykryłaby te pięć, które klient już wypełnił.
 */
function BriefAnswers({ brief }: { brief: Brief }) {
  return (
    <div className="mt-4 space-y-5 border-t border-[var(--hair)] pt-4">
      {brief.template.map((section) => {
        const answered = section.questions.filter((question) => {
          const value = brief.answers[question.id];
          return typeof value === 'string'
            ? value.trim().length > 0
            : Array.isArray(value) && value.length > 0;
        });

        if (answered.length === 0) return null;

        return (
          <section key={section.id}>
            <h3 className="label-caps text-ink-soft">{section.title}</h3>
            <dl className="mt-2 space-y-2.5">
              {answered.map((question) => {
                const value = brief.answers[question.id];
                const text = Array.isArray(value) ? value.join(', ') : (value ?? '');

                return (
                  <div key={question.id}>
                    <dt className="text-ink-soft text-xs">{question.label}</dt>
                    <dd className="text-ink text-sm whitespace-pre-line">{text}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
