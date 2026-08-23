import { Percent } from 'lucide-react';
import { AddLink } from './AddLink';
import { DiscountRow } from './DiscountRow';
import { calcDiscounts, type Discount, type QuoteBody } from '@/domain/quote';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';

/**
 * Sekcja „Rabaty” — ostatnia w dokumencie, tak jak w arkuszu.
 *
 * Rabaty przestały być pozycjami wyceny (T-32/T-36), bo procent musi wiedzieć,
 * od czego liczy. Renderujemy je jednak w tym samym rytmie co sekcje, żeby
 * dokument dalej czytał się jako jedna lista.
 */
export function DiscountsSection({
  body,
  currency,
  editing,
  onAdd,
  onToggle,
  onPatch,
  onRemove,
}: {
  body: QuoteBody;
  currency: string;
  editing: boolean;
  onAdd: () => void;
  onToggle: (discountId: string) => void;
  onPatch: (discountId: string, patch: Partial<Discount>) => void;
  onRemove: (discountId: string) => void;
}) {
  // Poza edycją pusta sekcja rabatów byłaby samym nagłówkiem.
  if (!editing && body.discounts.length === 0) return null;

  // Kwoty liczy domena — także po to, żeby wiersz wiedział, DLACZEGO wyszło zero.
  const { lines, totalCents } = calcDiscounts(body);
  const lineOf = (id: string) => lines.find((line) => line.discountId === id);

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 border-b border-[var(--doc-ink)] pb-2.5">
        <h2 className="flex-1 text-[18px] font-bold tracking-[0.02em] uppercase">
          {pl.editor.discountsTitle}
        </h2>
        <span className="amount text-[13px] text-[var(--doc-ink-soft)]">
          {totalCents > 0 ? '−' : ''}
          {formatMoney(totalCents, currency)}
        </span>
      </div>

      {body.discounts.length === 0 ? (
        <p className="py-3 text-[13px] text-[var(--doc-ink-soft)]">{pl.editor.discountsEmpty}</p>
      ) : (
        body.discounts.map((discount) => (
          <DiscountRow
            key={discount.id}
            discount={discount}
            line={lineOf(discount.id)}
            sections={body.sections}
            currency={currency}
            editing={editing}
            onToggle={() => onToggle(discount.id)}
            onPatch={(patch) => onPatch(discount.id, patch)}
            onRemove={() => onRemove(discount.id)}
          />
        ))
      )}

      {editing ? (
        <div className="mt-2.5">
          {/* `() => onAdd()` — patrz komentarz w `RoomsPanel`. */}
          <AddLink icon={Percent} onClick={() => onAdd()}>
            {pl.editor.addDiscountEntry}
          </AddLink>
        </div>
      ) : null}
    </section>
  );
}
