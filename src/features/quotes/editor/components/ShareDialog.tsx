import { useState } from 'react';
import { Check, Copy, Link2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateShare,
  useQuoteAcceptance,
  useQuoteComments,
  useRevokeShare,
  useShares,
} from '@/data/queries/useShares';
import {
  buildShareUrl,
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_PRESETS,
  shareState,
  type Share,
} from '@/domain/share/schema';
import { env } from '@/lib/env';
import { openExternal } from '@/lib/tauri';
import { formatDateTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

import { QuoteFeedbackCard } from '@/features/share/QuoteFeedbackCard';

interface Props {
  quoteId: string;
  quoteNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * „Udostępnij klientowi" — linki, uwagi i akceptacja (T-25).
 *
 * To jest dziś **główna droga wysłania oferty** (T-20 z Resendem odrzucone):
 * projektant tworzy link, kopiuje go i wysyła ze swojej poczty. Dlatego
 * „Kopiuj" jest pierwszym przyciskiem, a nie schowanym w menu.
 *
 * ## Szerokość okna
 *
 * 720 px, nie 560. Przy węższym sam adres linku (base64url — 43 znaki plus
 * domena) nie mieścił się w wierszu, a trzy przyciski akcji i trzy daty
 * łamały się w kilka rzędów. Okno wyglądało na zatłoczone dokładnie w tym
 * miejscu, w którym ma być czytelne.
 */
export function ShareDialog({ quoteId, quoteNumber, open, onOpenChange }: Props) {
  const shares = useShares(open ? quoteId : undefined);
  const comments = useQuoteComments(open ? quoteId : undefined);
  const acceptance = useQuoteAcceptance(open ? quoteId : undefined);
  const create = useCreateShare(quoteId);
  const revoke = useRevokeShare(quoteId);

  const [expiryDays, setExpiryDays] = useState<number | null>(DEFAULT_EXPIRY_DAYS);

  const handleCreate = () => {
    create.mutate(expiryDays, {
      onError: () => toast.error(pl.share.createFailed),
    });
  };

  const rows = shares.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(45rem,calc(100vw-3rem))] flex-col gap-4 overflow-y-auto sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{pl.share.title}</DialogTitle>
          <DialogDescription>{pl.share.description}</DialogDescription>
        </DialogHeader>

        <QuoteFeedbackCard
          acceptance={acceptance.data ?? null}
          comments={comments.data ?? []}
          quoteId={quoteId}
        />

        {/* Wybór ważności i przycisk w jednym rzędzie — to jedna czynność,
            a nie formularz do wypełniania. */}
        <div className="border-hair-strong flex flex-wrap items-end gap-3 rounded-[var(--radius-control)] border p-3">
          <label className="min-w-[10rem] flex-1">
            <span className="text-ink-soft block text-xs font-medium">{pl.share.validFor}</span>
            <select
              value={expiryDays === null ? 'never' : String(expiryDays)}
              onChange={(event) =>
                setExpiryDays(event.target.value === 'never' ? null : Number(event.target.value))
              }
              className="border-hair-strong bg-surface mt-1 w-full rounded-[var(--radius-control)] border px-2 py-1.5 text-sm"
            >
              {EXPIRY_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.days === null ? 'never' : preset.days}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={handleCreate} disabled={create.isPending}>
            <Link2 className="size-4" aria-hidden />
            {create.isPending ? pl.share.creating : pl.share.newLink}
          </Button>
        </div>

        {!env.shareBaseUrl ? (
          <p className="text-warning text-xs">{pl.share.baseUrlMissing}</p>
        ) : null}

        {rows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {rows.map((share) => (
              <ShareRow
                key={share.id}
                share={share}
                quoteNumber={quoteNumber}
                onRevoke={() =>
                  revoke.mutate(share.id, { onError: () => toast.error(pl.share.revokeFailed) })
                }
              />
            ))}
          </ul>
        ) : shares.isLoading ? null : (
          <p className="text-ink-soft text-sm">{pl.share.noLinks}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareRow({
  share,
  quoteNumber,
  onRevoke,
}: {
  share: Share;
  quoteNumber: string | null;
  onRevoke: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const state = shareState(share);
  const url = env.shareBaseUrl ? buildShareUrl(env.shareBaseUrl, share.token) : share.token;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(pl.share.copied);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(pl.share.copyFailed);
    }
  };

  const sendMail = () => {
    const subject = pl.share.mailSubject(quoteNumber ?? '');
    const body = pl.share.mailBody(url);
    // `mailto:` otwiera pocztę PROJEKTANTA. To jest cel, nie obejście —
    // oferta ma przyjść do inwestora od człowieka, z którym rozmawia,
    // a nie z naszej domeny (uzasadnienie w docs/IDEAS.md).
    void openExternal(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <li
      className={cn(
        'border-hair-strong rounded-[var(--radius-control)] border p-3',
        state !== 'active' && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2">
        <StateBadge state={state} />
        <span className="text-ink-soft ml-auto text-xs">
          {share.viewCount === 0 ? pl.share.neverOpened : pl.share.openedTimes(share.viewCount)}
        </span>
      </div>

      {/*
        Adres w polu na całą szerokość, tylko do odczytu i zaznaczalny.
        Wcześniej był akapitem z `truncate`: linku nie dawało się ani przeczytać
        w całości, ani zaznaczyć myszą, gdy schowek zawiódł.
      */}
      <input
        readOnly
        value={url}
        aria-label={pl.share.linkLabel}
        onFocus={(event) => event.currentTarget.select()}
        className="border-hair bg-surface-2 text-ink-soft mt-2 w-full rounded-[var(--radius-control)] border px-2 py-1.5 font-mono text-xs"
      />

      <div className="text-ink-faint mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span>
          {pl.share.created}: {formatDateTime(share.createdAt)}
        </span>
        <span>
          {share.expiresAt
            ? `${pl.share.expiresAt}: ${formatDateTime(share.expiresAt)}`
            : pl.share.neverExpires}
        </span>
        {share.lastViewedAt ? (
          <span>
            {pl.share.lastOpened}: {formatDateTime(share.lastViewedAt)}
          </span>
        ) : null}
      </div>

      {state === 'active' ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void copy()}>
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {pl.share.copy}
          </Button>
          <Button size="sm" variant="outline" onClick={sendMail}>
            <Mail className="size-3.5" aria-hidden />
            {pl.share.sendByMail}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            title={pl.share.revokeConfirm}
            onClick={onRevoke}
          >
            <Trash2 className="size-3.5" aria-hidden />
            {pl.share.revoke}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function StateBadge({ state }: { state: 'active' | 'revoked' | 'expired' }) {
  const label =
    state === 'active'
      ? pl.share.active
      : state === 'revoked'
        ? pl.share.revoked
        : pl.share.expired;

  return (
    <span
      className={cn(
        'rounded-[var(--radius-pill)] px-2 py-0.5 text-xs font-medium',
        state === 'active' ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-ink-soft',
      )}
    >
      {label}
    </span>
  );
}
