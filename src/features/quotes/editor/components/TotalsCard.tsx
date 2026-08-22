import { calcQuoteTotals, type QuoteBody } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
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
      <span className="text-[var(--doc-ink-soft)]">{label}</span>
      <span
        className={cn(
          'amount font-semibold',
          tone === 'discount' && 'text-[var(--doc-terracotta)]',
          tone === 'muted' && 'text-[var(--doc-ink-soft)]',
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
}: {
  body: QuoteBody;
  currency: string;
  issueDate: string;
}) {
  const totals = calcQuoteTotals(body);
  const validUntil = addDays(new Date(issueDate), body.validDays);
  const showVat = body.vatRate > 0;

  return (
    <aside
      className={cn(
        'rounded-[14px] border border-[var(--doc-hair)] bg-[var(--doc-surface)] p-[18px_24px]',
        'shadow-[0_4px_24px_rgba(33,32,28,0.06)]',
      )}
    >
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

      <div className="mt-3.5 border-t border-[var(--doc-hair)] pt-3.5">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--doc-ink-soft)] uppercase">
          {pl.editor.net}
        </p>
        <p className="amount mt-1 text-[28px] leading-none font-black">
          {formatMoney(totals.netCents, currency)}
        </p>
      </div>

      {showVat ? (
        <div className="mt-3.5 space-y-2 border-t border-[var(--doc-hair)] pt-3.5">
          <Line
            label={`${pl.editor.vat} ${body.vatRate}%`}
            value={formatMoney(totals.vatCents, currency)}
            tone="muted"
          />
          <Line label={pl.editor.gross} value={formatMoney(totals.grossCents, currency)} />
        </div>
      ) : null}

      <p className="mt-4 text-[12px] text-[var(--doc-ink-soft)]">
        {pl.editor.validUntil}: {formatDate(validUntil)}
      </p>
    </aside>
  );
}
