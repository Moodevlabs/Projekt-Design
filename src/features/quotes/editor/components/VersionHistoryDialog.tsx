import { useMemo, useState } from 'react';
import { ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuote, useQuotesList } from '@/data/queries/useQuotes';
import {
  diffQuoteBodies,
  hasChanges,
  type ChangedEntry,
  type QuoteDiff,
} from '@/domain/quote/diff';
import { versionLabel } from '@/domain/quote/versions';
import { formatMoney } from '@/domain/money';
import { formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

interface Props {
  lineageId: string;
  currentId: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Historia wersji z porównaniem (T-22).
 *
 * Do 1.0 wersje były tylko listą numerów (T-57): widać było, że v2 istnieje,
 * ale nie **co się w niej zmieniło**. To okno odpowiada na jedyne pytanie,
 * które projektant naprawdę zadaje po telefonie z inwestorem: „o ile i przez
 * co ta wersja różni się od poprzedniej".
 */
export function VersionHistoryDialog({
  lineageId,
  currentId,
  currency,
  open,
  onOpenChange,
}: Props) {
  const lineage = useQuotesList(open ? { lineageId } : {});
  const versions = useMemo(
    () => [...(lineage.data ?? [])].sort((a, b) => b.version - a.version),
    [lineage.data],
  );

  // Domyślnie porównujemy bieżącą wersję z poprzednią — to jest pytanie,
  // które pada w 9 przypadkach na 10.
  const currentIndex = versions.findIndex((row) => row.id === currentId);
  const defaultOlder = versions[currentIndex + 1]?.id ?? versions[1]?.id ?? null;
  const [olderId, setOlderId] = useState<string | null>(null);
  const compareOlderId = olderId ?? defaultOlder;

  const newer = useQuote(currentId);
  const older = useQuote(compareOlderId ?? '');

  const diff: QuoteDiff | null = useMemo(() => {
    if (!newer.data?.body || !older.data?.body) return null;
    return diffQuoteBodies(older.data.body, newer.data.body);
  }, [newer.data?.body, older.data?.body]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[640px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pl.versions.title}</DialogTitle>
          <DialogDescription>{pl.versions.description}</DialogDescription>
        </DialogHeader>

        {versions.length < 2 ? (
          <p className="text-ink-soft text-sm">{pl.versions.onlyOne}</p>
        ) : (
          <>
            <label className="block">
              <span className="text-ink-soft text-xs font-medium">{pl.versions.compareWith}</span>
              <select
                value={compareOlderId ?? ''}
                onChange={(event) => setOlderId(event.target.value)}
                className="border-hair-strong bg-surface mt-1 w-full rounded-[var(--radius-control)] border px-2 py-1.5 text-sm"
              >
                {versions
                  .filter((row) => row.id !== currentId)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {versionLabel(row.version)} · {formatDate(row.createdAt)}
                    </option>
                  ))}
              </select>
            </label>

            {diff ? (
              <DiffView diff={diff} currency={currency} />
            ) : (
              <p className="text-ink-soft text-sm">{pl.common.loading}</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiffView({ diff, currency }: { diff: QuoteDiff; currency: string }) {
  const rosnie = diff.netDeltaCents > 0;

  return (
    <div className="space-y-4">
      <div className="border-hair-strong rounded-[var(--radius-control)] border p-3">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink-soft">{pl.versions.totalsBefore}</span>
          <span className="tabular-nums">{formatMoney(diff.totalsBefore.netCents, currency)}</span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm">
          <span className="text-ink-soft">{pl.versions.totalsAfter}</span>
          <span className="tabular-nums">{formatMoney(diff.totalsAfter.netCents, currency)}</span>
        </div>
        <div className="border-hair mt-2 flex items-baseline justify-between border-t pt-2">
          <span className="text-sm font-medium">{pl.versions.delta}</span>
          <span
            className={cn(
              'font-display text-lg tabular-nums',
              diff.netDeltaCents === 0 ? '' : rosnie ? 'text-warning' : 'text-positive',
            )}
          >
            {/* Znak jest tu treścią, nie ozdobą: „+4 000 zł" i „4 000 zł"
                znaczą co innego, gdy rozmawia się z inwestorem o podwyżce. */}
            {diff.netDeltaCents > 0 ? '+' : ''}
            {formatMoney(diff.netDeltaCents, currency)}
          </span>
        </div>
      </div>

      {!hasChanges(diff) ? (
        <p className="text-ink-soft text-sm">{pl.versions.noChanges}</p>
      ) : (
        <div className="space-y-3">
          <Group
            icon={<Plus className="size-3.5" aria-hidden />}
            title={pl.versions.added(diff.added.length)}
            hidden={diff.added.length === 0}
          >
            {diff.added.map((entry) => (
              <Row key={entry.id} name={entry.name} path={entry.path} />
            ))}
          </Group>

          <Group
            icon={<Minus className="size-3.5" aria-hidden />}
            title={pl.versions.removed(diff.removed.length)}
            hidden={diff.removed.length === 0}
          >
            {diff.removed.map((entry) => (
              <Row key={entry.id} name={entry.name} path={entry.path} />
            ))}
          </Group>

          <Group
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            title={pl.versions.changed(diff.changed.length)}
            hidden={diff.changed.length === 0}
          >
            {diff.changed.map((entry) => (
              <ChangedRow key={entry.id} entry={entry} currency={currency} />
            ))}
          </Group>

          {diff.unchangedCount > 0 ? (
            <p className="text-ink-faint text-xs">{pl.versions.unchanged(diff.unchangedCount)}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Group({
  icon,
  title,
  hidden,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hidden: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <div>
      <h3 className="text-ink-soft flex items-center gap-1.5 text-xs font-semibold tracking-[0.1em] uppercase">
        {icon}
        {title}
      </h3>
      <ul className="divide-hair mt-1 divide-y">{children}</ul>
    </div>
  );
}

function Row({ name, path }: { name: string; path: string }) {
  return (
    <li className="py-1.5">
      <p className="text-sm">{name || pl.editor.newItemName}</p>
      <p className="text-ink-faint text-xs">{path}</p>
    </li>
  );
}

function ChangedRow({ entry, currency }: { entry: ChangedEntry; currency: string }) {
  return (
    <li className="py-1.5">
      <p className="text-sm">
        {entry.previousName !== entry.name ? (
          <>
            <span className="text-ink-soft line-through">{entry.previousName}</span>
            <ArrowRight className="mx-1 inline size-3" aria-hidden />
          </>
        ) : null}
        {entry.name || pl.editor.newItemName}
      </p>
      <p className="text-ink-faint text-xs">{entry.path}</p>
      <ul className="mt-0.5 space-y-0.5">
        {entry.changes.map((change) => (
          <li key={change.field} className="text-ink-soft text-xs">
            {describeChange(change, currency)}
          </li>
        ))}
      </ul>
    </li>
  );
}

function describeChange(change: ChangedEntry['changes'][number], currency: string): string {
  switch (change.field) {
    case 'price':
      return pl.versions.changePrice(
        formatMoney(Number(change.before), currency),
        formatMoney(Number(change.after), currency),
      );
    case 'qty':
      return pl.versions.changeQty(Number(change.before), Number(change.after));
    case 'enabled':
      return change.after ? pl.versions.turnedOn : pl.versions.turnedOff;
    case 'path':
      return pl.versions.changePath(String(change.before), String(change.after));
    case 'name':
      return pl.versions.changeName;
  }
}
