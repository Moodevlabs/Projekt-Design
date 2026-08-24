import { formatMoney } from '@/domain/money';
import { priceSuffix, type Unit } from '@/domain/library/units';
import { pl } from '@/i18n/pl';

/**
 * „Podgląd w ofercie" (05-UI §3a.4).
 *
 * Pokazuje, jak usługa **wygląda u klienta**, i odświeża się przy pisaniu —
 * bez zapisu. Pełnoekranowy formularz z sześcioma sekcjami łatwo wypełnić
 * tak, że wynik zaskakuje; podgląd zdejmuje z człowieka konieczność
 * wyobrażania sobie efektu.
 *
 * Świadomie NIE jest to `ItemRow` z edytora: tamten wiersz potrzebuje
 * kontekstu wyceny (pomieszczenia, tryb cen, dnd), którego tu nie ma,
 * a podrabianie go pustymi wartościami dawałoby podgląd czegoś innego niż
 * to, co naprawdę zobaczy klient.
 */
export function ItemPreviewCard({
  name,
  description,
  unitPriceCents,
  unit,
  unitLabel,
}: {
  name: string;
  description: string;
  unitPriceCents: number | null;
  unit: Unit;
  unitLabel: string;
}) {
  return (
    <section className="card-surface space-y-3 p-4">
      <h2 className="text-ink text-sm font-semibold">{pl.library.preview}</h2>

      <div className="border-hair flex items-start gap-3 rounded-[var(--radius-control)] border px-3 py-2.5">
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-sm font-medium">
            {name || pl.library.newItemName}
          </span>
          {description ? (
            <span className="text-ink-soft mt-0.5 block text-xs leading-relaxed">
              {description}
            </span>
          ) : null}
        </span>

        <span className="text-ink shrink-0 text-sm tabular-nums">
          {unitPriceCents === null ? (
            <span className="text-ink-soft text-xs italic">{pl.editor.individualPrice}</span>
          ) : (
            `${formatMoney(unitPriceCents)}${priceSuffix(unit, unitLabel)}`
          )}
        </span>
      </div>
    </section>
  );
}
