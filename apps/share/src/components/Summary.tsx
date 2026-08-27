import { calcQuoteTotals } from '@/domain/quote/calc';
import { countIndividualItems } from '@/domain/quote/individual';
import { formatMoney } from '@/domain/money';
import type { QuoteBody } from '@/domain/quote/schema';

interface Props {
  body: QuoteBody;
  currency: string;
}

/**
 * Podsumowanie kwot. `body` przychodzi już z nałożonym wyborem klienta
 * (`applyEnabledIds`), więc liczymy zwykłym `calcQuoteTotals` — bez żadnej
 * arytmetyki po tej stronie.
 */
export function Summary({ body, currency }: Props) {
  const totals = calcQuoteTotals(body);
  const individual = countIndividualItems(body);
  const showVat = body.vatRate > 0;

  return (
    <div className="border-t border-[var(--hair-strong)] pt-4">
      <dl className="space-y-1.5 text-sm">
        <Row label="Wartość pozycji" value={formatMoney(totals.itemsCents, currency)} />
        {totals.discountsCents > 0 ? (
          <Row
            label="Rabaty"
            value={`− ${formatMoney(totals.discountsCents, currency)}`}
            tone="discount"
          />
        ) : null}
        {showVat ? (
          <>
            <Row label="Netto" value={formatMoney(totals.netCents, currency)} />
            <Row label={`VAT ${body.vatRate}%`} value={formatMoney(totals.vatCents, currency)} />
          </>
        ) : null}
      </dl>

      <div className="mt-3 flex items-baseline justify-between border-t border-[var(--hair)] pt-3">
        <span className="font-display text-base">{showVat ? 'Razem brutto' : 'Razem'}</span>
        <span className="tabular text-accent font-display text-2xl">
          {formatMoney(showVat ? totals.grossCents : totals.netCents, currency)}
        </span>
      </div>

      {/*
        Bez tego zdania klient dostaje kwotę, która nie obejmuje wszystkiego,
        co widzi na liście — i nikt go o tym nie uprzedza.
      */}
      {individual > 0 ? (
        <p className="text-ink-soft mt-2 text-xs">
          + {individual}{' '}
          {individual === 1
            ? 'pozycja wyceniana indywidualnie'
            : 'pozycji wycenianych indywidualnie'}{' '}
          — do ustalenia osobno.
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'discount' }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`tabular ${tone === 'discount' ? 'text-discount' : ''}`}>{value}</dd>
    </div>
  );
}
