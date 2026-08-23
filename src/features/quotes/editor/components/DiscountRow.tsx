import { Trash2 } from 'lucide-react';
import { InlineText } from './InlineText';
import { InlineMoney } from './InlineMoney';
import { ItemToggle } from './ItemToggle';
import type { DiscountLine } from '@/domain/quote';
import type { Discount, Section } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/** Zaokrąglenia do wyboru — w groszach. `MROUND(…; 10)` z arkusza to 1000. */
const ROUNDINGS = [0, 100, 1_000, 10_000];

/**
 * Wiersz rabatu. Wygląda jak pozycja wyceny (przełącznik, nazwa, kwota po
 * prawej), bo dla klienta to ten sam rodzaj wiersza — ale pod spodem ma
 * kontrolki, których pozycja mieć nie może: procent, zakres i warunek.
 */
export function DiscountRow({
  discount,
  line,
  sections,
  currency,
  editing,
  onToggle,
  onPatch,
  onRemove,
}: {
  discount: Discount;
  /** Rozliczenie z domeny — kwota i powód, dla którego wyszło zero. */
  line: DiscountLine | undefined;
  sections: Section[];
  currency: string;
  editing: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<Discount>) => void;
  onRemove: () => void;
}) {
  const label = discount.name || pl.editor.newDiscountName;
  const amountCents = line?.amountCents ?? 0;
  const unmet = line !== undefined && !line.conditionMet && discount.enabled;

  return (
    <div className="flex flex-col gap-1 border-b border-[var(--doc-hair)] py-[13px]">
      <div className="flex items-center gap-[14px]">
        <ItemToggle
          checked={discount.enabled}
          onChange={onToggle}
          label={pl.editor.discountToggle(label)}
        />

        <div className="min-w-0 flex-1">
          <InlineText
            value={discount.name}
            onCommit={(name) => onPatch({ name })}
            readOnly={!editing}
            placeholder={pl.editor.newDiscountName}
            ariaLabel={pl.editor.discountNameLabel(label)}
            className={cn(
              'inline-field text-[14.5px] font-semibold',
              discount.enabled ? 'text-[var(--doc-ink)]' : 'text-[var(--doc-ink-soft)]',
            )}
          />
          {unmet ? (
            // Zero bez wyjaśnienia wygląda jak błąd. Z licznikiem staje się
            // zachętą: widać, ile brakuje do pełnego etapu.
            <p className="text-[12px] text-[var(--doc-terracotta)]">
              {pl.editor.discountUnmet(line.enabledInScope, line.itemsInScope)}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            'flex min-w-[86px] items-center justify-end gap-0.5 text-[14.5px]',
            discount.enabled && amountCents > 0
              ? 'text-[var(--doc-terracotta)]'
              : 'text-[var(--doc-price-off)]',
          )}
        >
          <span aria-hidden>−</span>
          <span className="amount">{formatMoney(amountCents, currency)}</span>
        </div>

        {editing ? (
          <button
            type="button"
            aria-label={pl.editor.removeDiscount(label)}
            onClick={onRemove}
            className={cn(
              'flex size-[22px] shrink-0 items-center justify-center rounded-full',
              'text-[var(--doc-ink-soft)] transition-colors',
              'hover:bg-[var(--doc-danger-wash)] hover:text-[var(--doc-terracotta)]',
            )}
          >
            <Trash2 className="size-[13px]" aria-hidden />
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2 pl-[34px] text-[12px]">
          <select
            value={discount.type}
            aria-label={pl.editor.discountTypeLabel(label)}
            onChange={(event) =>
              onPatch({ type: event.target.value === 'percent' ? 'percent' : 'fixed' })
            }
            className="border-hair rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5 outline-none"
          >
            <option value="fixed">{pl.editor.discountTypeFixed}</option>
            <option value="percent">{pl.editor.discountTypePercent}</option>
          </select>

          {discount.type === 'percent' ? (
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={discount.percent ?? 0}
              aria-label={pl.editor.discountValueLabel(label)}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                // Domena trzyma 0–100; wpis poza zakresem przycinamy zamiast
                // zapisywać wartość, której `calcDiscounts` i tak by nie przyjął.
                if (Number.isFinite(next)) {
                  onPatch({ percent: Math.min(100, Math.max(0, next)) });
                }
              }}
              className="border-hair tabular w-16 rounded-[var(--radius-control)] border px-1.5 py-0.5 text-right outline-none"
            />
          ) : (
            <InlineMoney
              cents={discount.valueCents ?? 0}
              currency={currency}
              onCommit={(valueCents) => onPatch({ valueCents })}
              ariaLabel={pl.editor.discountValueLabel(label)}
              className="price-field inline-field amount w-[76px]"
            />
          )}

          <select
            value={discount.scope}
            aria-label={pl.editor.discountScopeLabel(label)}
            onChange={(event) => {
              const scope = event.target.value as Discount['scope'];
              // Zmiana zakresu czyści wskazania poprzedniego — inaczej rabat
              // „na sekcję” pamiętałby pozycje z trybu „wybrane”.
              onPatch({
                scope,
                sectionId: scope === 'section' ? (sections[0]?.id ?? null) : null,
                itemIds: [],
              });
            }}
            className="border-hair rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5 outline-none"
          >
            <option value="quote">{pl.editor.discountScopeQuote}</option>
            <option value="section">{pl.editor.discountScopeSection}</option>
            <option value="items">{pl.editor.discountScopeItems}</option>
          </select>

          {discount.scope === 'section' ? (
            <select
              value={discount.sectionId ?? ''}
              aria-label={pl.editor.discountScopeSection}
              onChange={(event) => onPatch({ sectionId: event.target.value || null })}
              className="border-hair max-w-[160px] rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5 outline-none"
            >
              <option value="">{pl.editor.discountSectionMissing}</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title || pl.editor.newSectionName}
                </option>
              ))}
            </select>
          ) : null}

          <label className="text-ink-soft flex items-center gap-1">
            <input
              type="checkbox"
              checked={discount.condition === 'all_items_in_scope_enabled'}
              aria-label={pl.editor.discountConditionLabel(label)}
              onChange={(event) =>
                onPatch({
                  condition: event.target.checked ? 'all_items_in_scope_enabled' : 'always',
                })
              }
            />
            {pl.editor.discountConditionShort}
          </label>

          <select
            value={discount.roundToCents}
            aria-label={pl.editor.discountRoundLabel(label)}
            onChange={(event) => onPatch({ roundToCents: Number(event.target.value) })}
            className="border-hair rounded-[var(--radius-control)] border bg-transparent px-1.5 py-0.5 outline-none"
          >
            {ROUNDINGS.map((step) => (
              <option key={step} value={step}>
                {step === 0 ? pl.editor.discountRoundNone : pl.editor.discountRoundTo(step / 100)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
