import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared';
import type { LibraryItemSnapshot } from '@/domain/library/schema';
import { GroupItemPicker } from './GroupItemPicker';
import { pl } from '@/i18n/pl';

type GroupItemsListProps = {
  groupName: string;
  items: LibraryItemSnapshot[];
  onChange: (items: LibraryItemSnapshot[]) => void;
};

/**
 * Zawartość zestawu: co w nim jest, w jakiej ilości, i jak to zmienić.
 *
 * Dodanie i usunięcie zapisuje się od razu — to pojedyncze gesty, nie strumień
 * klawiszy, więc nie ma czego zbierać w szkicu (inaczej niż przy nazwie zestawu
 * i przy karcie pozycji, gdzie zapis jest jawny).
 */
export function GroupItemsList({ groupName, items, onChange }: GroupItemsListProps) {
  return (
    <div className="border-hair flex flex-col gap-2 border-t pt-3">
      {items.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.library.groupItemsEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={`${item.libraryItemId ?? item.name}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-ink min-w-0 flex-1 truncate">{item.name}</span>

              <QtyInput
                qty={item.qty}
                ariaLabel={pl.library.groupItemQty(item.name)}
                onCommit={(qty) =>
                  onChange(items.map((row, at) => (at === index ? { ...row, qty } : row)))
                }
              />

              <Money
                cents={item.unitPriceCents ?? 0}
                variant={item.kind === 'discount' ? 'discount' : 'default'}
                className="shrink-0 text-sm"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={pl.library.groupRemoveItem(item.name)}
                onClick={() => onChange(items.filter((_, at) => at !== index))}
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <GroupItemPicker groupName={groupName} onPick={(snapshot) => onChange([...items, snapshot])} />

      <p className="text-ink-soft text-xs">{pl.library.groupItemsHint}</p>
    </div>
  );
}

/**
 * Ilość w zestawie. Commit dopiero po wyjściu z pola albo na Enter — inaczej
 * każdy wciśnięty klawisz byłby osobnym zapisem do bazy. Wpis, którego nie da
 * się odczytać jako liczby dodatniej, wraca do poprzedniej wartości: `qty` jest
 * w domenie `positive()`, więc zero ani minus nie przeszłyby walidacji.
 */
function QtyInput({
  qty,
  ariaLabel,
  onCommit,
}: {
  qty: number;
  ariaLabel: string;
  onCommit: (qty: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(qty));

  useEffect(() => setDraft(String(qty)), [qty]);

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(String(qty));
      return;
    }
    if (parsed !== qty) onCommit(parsed);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="border-hair focus-within:border-ring tabular w-14 shrink-0 rounded-[var(--radius-control)] border px-2 py-0.5 text-right text-sm outline-none"
    />
  );
}
