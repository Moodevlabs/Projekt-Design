import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { QuotesTable } from './QuotesTable';
import { groupByLineage } from '@/domain/quote';
import type { QuoteSummary } from '@/data/repos/quotes.repo';
import { pl } from '@/i18n/pl';

/**
 * Lista wycen **grupowana po linii wersji** (koncepcja §4, chunk W1).
 *
 * Wiersz główny to najnowsza wersja, starsze chowają się w rozwinięciu.
 * Bez tego projekt z trzema podejściami wyglądałby jak projekt z trzema
 * ofertami — a to jedna oferta, poprawiana trzy razy.
 *
 * Linia jednowersyjna (czyli zdecydowana większość) nie dostaje żadnego
 * dodatkowego elementu: rozwijanie czegoś, co nie ma zawartości, byłoby
 * kontrolką bez treści.
 */
export function QuotesByLineage({
  rows,
  loading,
}: {
  rows: QuoteSummary[];
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = groupByLineage(rows);
  const toggle = (lineageId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(lineageId)) next.delete(lineageId);
      else next.add(lineageId);
      return next;
    });
  };

  if (loading || groups.length === 0) {
    return <QuotesTable rows={rows} loading={loading} />;
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const open = expanded.has(group.lineageId);
        const hasOlder = group.older.length > 0;

        return (
          <div key={group.lineageId} className="space-y-1">
            <QuotesTable rows={open ? [group.latest, ...group.older] : [group.latest]} loading={false} />

            {hasOlder ? (
              <button
                type="button"
                onClick={() => toggle(group.lineageId)}
                aria-expanded={open}
                className="text-ink-soft hover:text-ink flex items-center gap-1.5 px-2 text-xs"
              >
                {open ? (
                  <ChevronDown className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
                {open ? pl.quotes.hideOlder : pl.quotes.olderVersions(group.older.length)}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
