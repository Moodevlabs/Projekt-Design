import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { calcWorkload, calcQuoteTotals, calcSectionBreakdown, type QuoteBody } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { formatMinutes } from '@/domain/time';
import { WorkloadPopover } from './WorkloadPopover';
import { addDays, formatDate } from '@/lib/dates';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

function Line({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'discount' | 'muted';
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 text-[12.5px]">
      <span className="text-[var(--ink-soft)]">{label}</span>
      <span
        className={cn(
          'amount font-semibold',
          tone === 'discount' && 'text-[var(--discount)]',
          tone === 'muted' && 'text-[var(--ink-soft)]',
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Karta podsumowania. Kolejność wierszy jest z prototypu (suma → rabaty →
 * razem), VAT i brutto to nasze rozszerzenie.
 *
 * Uwaga na rabat większy niż suma: `calcQuoteTotals` przycina podstawę do zera,
 * ale w linii „Rabaty" pokazujemy **prawdziwą** kwotę rabatu — inaczej
 * użytkownik nie zrozumie, skąd zero.
 */
export function TotalsCard({
  body,
  currency,
  issueDate,
  hourlyRateCents = null,
}: {
  body: QuoteBody;
  currency: string;
  issueDate: string;
  /** Stawka z ustawień — do szacunku czasu w wycenie kwotowej (F2.3). */
  hourlyRateCents?: number | null;
}) {
  const totals = calcQuoteTotals(body);
  // Podzial na etapy zwiniety domyslnie — to narzedzie do sprawdzania,
  // a nie glowna liczba, ktora ma rzucac sie w oczy.
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const bySection = calcSectionBreakdown(body);
  const validUntil = addDays(new Date(issueDate), body.validDays);
  const showVat = body.vatRate > 0;
  const workload = calcWorkload(body);

  return (
    <aside
      className={cn('card-surface px-6 py-5')}
    >
      <div className="mb-2 flex justify-end">
        <WorkloadPopover body={body} fallbackRateCents={hourlyRateCents} />
      </div>

      <div className="space-y-2">
        <Line label={pl.editor.itemsTotal} value={formatMoney(totals.itemsCents, currency)} />
        {totals.discountsCents > 0 ? (
          <Line
            label={pl.editor.discounts}
            value={`−${formatMoney(totals.discountsCents, currency)}`}
            tone="discount"
          />
        ) : null}
      </div>

      <div className="mt-3.5 border-t border-[var(--hair)] pt-3.5">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--ink-soft)] uppercase">
          {pl.editor.net}
        </p>
        <p className="amount mt-1 text-[28px] leading-none font-black">
          {formatMoney(totals.netCents, currency)}
        </p>
      </div>

      {/*
        Pracochlonnosc stoi PRZY sumie, a nie zamiast niej: w trybie godzinowym
        obie liczby sa wazne — klient placi kwote, a wykonawca planuje czas.
      */}
      {workload.minutesTotal > 0 ? (
        <div className="mt-3.5 border-t border-[var(--hair)] pt-3.5">
          <Line
            label={pl.editor.workload}
            value={formatMinutes(workload.minutesTotal)}
            tone="muted"
          />
        </div>
      ) : null}

      {showVat ? (
        <div className="mt-3.5 space-y-2 border-t border-[var(--hair)] pt-3.5">
          <Line
            label={`${pl.editor.vat} ${body.vatRate}%`}
            value={formatMoney(totals.vatCents, currency)}
            tone="muted"
          />
          <Line label={pl.editor.gross} value={formatMoney(totals.grossCents, currency)} />
        </div>
      ) : null}

      {bySection.length > 1 ? (
        <div className="mt-3.5 border-t border-[var(--hair)] pt-3.5">
          <button
            type="button"
            aria-expanded={sectionsOpen}
            aria-label={sectionsOpen ? pl.editor.perSectionHide : pl.editor.perSectionShow}
            onClick={() => setSectionsOpen((previous) => !previous)}
            className="flex w-full items-center gap-1 text-[11px] font-semibold tracking-[0.1em] text-[var(--ink-soft)] uppercase"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', sectionsOpen && 'rotate-180')}
              aria-hidden
            />
            {pl.editor.perSection}
          </button>

          {sectionsOpen ? (
            <div className="mt-2 space-y-2">
              {bySection.map((section) => (
                <Line
                  key={section.sectionId}
                  label={section.title || pl.editor.perSectionUnnamed}
                  value={formatMoney(section.netCents, currency)}
                  tone="muted"
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-4 text-[12px] text-[var(--ink-soft)]">
        {pl.editor.validUntil}: {formatDate(validUntil)}
      </p>
    </aside>
  );
}
