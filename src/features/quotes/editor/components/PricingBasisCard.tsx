import { Clock, Wallet } from 'lucide-react';
import { MoneyInput } from '@/features/library/components/MoneyInput';
import { formatMinutes } from '@/domain/time';
import { calcWorkload, type PricingBasis, type QuoteBody } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Sposób liczenia wyceny: kwotowo czy godzinowo (F2.2).
 *
 * Karta stoi w **prawej kolumnie, nie na papierze** — wbrew literze
 * `FEATURES §F2.2`, gdzie przełącznik miał trafić do nagłówka dokumentu.
 * Powód: stawka godzinowa to liczba wewnętrzna. Na arkuszu, który idzie do
 * klienta, „150 zł/h" mówi mu, ile zarabiasz na godzinę — a to informacja,
 * którą powinno się ujawniać świadomie, nie przez układ formularza.
 *
 * Widoczna tylko w trybie edycji: w podglądzie nie ma czego przełączać.
 */
export function PricingBasisCard({
  body,
  onPatch,
  onBasisChange,
}: {
  body: QuoteBody;
  onPatch: (patch: Partial<QuoteBody>) => void;
  /** Zmiana trybu idzie osobną drogą — może wymagać pytania o przeliczenie. */
  onBasisChange: (basis: PricingBasis) => void;
}) {
  const godzinowa = body.pricingBasis === 'time';
  const workload = calcWorkload(body);

  return (
    <aside className="card-surface space-y-3 px-6 py-5">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--ink-soft)] uppercase">
        {pl.editor.pricingBasis}
      </p>

      <div
        role="radiogroup"
        aria-label={pl.editor.pricingBasis}
        className="border-hair flex items-center rounded-[var(--radius-pill)] border p-0.5"
      >
        <BasisOption
          value="amount"
          current={body.pricingBasis}
          icon={Wallet}
          label={pl.editor.basisAmount}
          onSelect={onBasisChange}
        />
        <BasisOption
          value="time"
          current={body.pricingBasis}
          icon={Clock}
          label={pl.editor.basisTime}
          onSelect={onBasisChange}
        />
      </div>

      {godzinowa ? (
        <div className="space-y-2">
          <label
            htmlFor="hourly-rate"
            className="text-ink-soft block text-[11px] font-semibold tracking-[0.06em] uppercase"
          >
            {pl.editor.hourlyRate}
          </label>
          <MoneyInput
            cents={body.hourlyRateCents ?? 0}
            onChange={(hourlyRateCents) =>
              // Zero znaczy „nie podano" — bez stawki nie ma z czego liczyć,
              // a zapisanie zera udawałoby darmową pracę.
              onPatch({ hourlyRateCents: hourlyRateCents > 0 ? hourlyRateCents : null })
            }
            ariaLabel={pl.editor.hourlyRate}
            className="w-full"
          />

          {body.hourlyRateCents ? (
            <p className="text-ink-soft text-xs">
              {pl.editor.workload}: <span className="tabular">{formatMinutes(workload.minutesTotal)}</span>
            </p>
          ) : (
            // Bez stawki wszystkie kwoty wychodzą zerowe — trzeba powiedzieć
            // dlaczego, bo inaczej wygląda to jak zepsuta wycena.
            <p className="text-[var(--doc-terracotta)] text-xs">{pl.editor.hourlyRateMissing}</p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

function BasisOption({
  value,
  current,
  icon: Icon,
  label,
  onSelect,
}: {
  value: PricingBasis;
  current: PricingBasis;
  icon: typeof Clock;
  label: string;
  onSelect: (basis: PricingBasis) => void;
}) {
  const active = current === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => {
        if (!active) onSelect(value);
      }}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-ink-soft hover:text-ink',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
