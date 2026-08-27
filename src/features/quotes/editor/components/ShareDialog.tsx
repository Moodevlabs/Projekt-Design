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

import { QuoteFeedbackCard } from './QuoteFeedbackCard';

interface Props {
  quoteId: string;
  quoteNumber: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * „Udostępnij klientowi" — jedno miejsce na linki, uwagi i akceptację.
 *
 * To jest dziś **główna droga wysłania oferty** (T-20 z Resendem odrzucone):
 * projektant tworzy link, kopiuje go i wysyła ze swojej poczty. Dlatego
 * „Kopiuj" jest pierwszym przyciskiem, a nie schowanym w menu.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[560px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pl.share.title}</DialogTitle>
          <DialogDescription>{pl.share.description}</DialogDescription>
        </DialogHeader>

        <QuoteFeedbackCard
          acceptance={acceptance.data ?? null}
          comments={comments.data ?? []}
          quoteId={quoteId}
        />

        <div className="border-hair-strong flex items-end gap-2 rounded-[var(--radius-control)] border p-3">
          <label className="flex-1">
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

        <ul className="space-y-2">
          {(shares.data ?? []).map((share) => (
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

        {(shares.data ?? []).length === 0 && !shares.isLoading ? (
          <p className="text-ink-soft text-sm">{pl.share.noLinks}</p>
        ) : null}
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

      <p className="text-ink-faint mt-2 truncate font-mono text-xs" title={url}>
        {url}
      </p>

      <div className="text-ink-soft mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
        <div className="mt-3 flex gap-2">
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
