import { useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import type { LibraryItem } from '@/data/repos/library.repo';
import { pricingChoiceWords, type BriefProposalItem } from '@/domain/ai';
import { categoryLabel, type LibraryCategory } from '@/domain/library/schema';
import { pricingChoiceFor } from '@/domain/library/units';
import { formatMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

interface Row {
  proposed: BriefProposalItem;
  item: LibraryItem;
}

interface GroupOfRows {
  key: string;
  label: string;
  rows: Row[];
}

/**
 * Pozycje z propozycji pogrupowane po grupie biblioteki.
 *
 * Grupa jest tu porządkiem, w jakim projektant MYŚLI o cenniku („01 ·
 * Przygotowanie", „02 · Koncepcja"), więc listę układamy po niej, a nie
 * w kolejności z odpowiedzi modelu. Pozycje spoza biblioteki (obce `id`)
 * nie trafiają na listę wcale — `applyBriefProposal` i tak by je odrzucił,
 * a pokazanie wiersza bez nazwy i ceny byłoby kłamstwem.
 */
export function ProposalItems({
  items,
  libraryById,
  categories,
  currency,
  onToggle,
}: {
  items: BriefProposalItem[];
  libraryById: ReadonlyMap<string, LibraryItem>;
  categories: ReadonlyMap<string, LibraryCategory>;
  currency: string;
  onToggle: (libraryItemId: string, enabled: boolean) => void;
}) {
  const groups = useMemo<GroupOfRows[]>(() => {
    const byKey = new Map<string, GroupOfRows>();
    for (const proposed of items) {
      const item = libraryById.get(proposed.libraryItemId);
      if (!item) continue;
      const category = item.categoryId ? categories.get(item.categoryId) : undefined;
      const key = category?.id ?? '';
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          label: category ? categoryLabel(category) : pl.ai.brief.withoutGroup,
          rows: [],
        };
        byKey.set(key, group);
      }
      group.rows.push({ proposed, item });
    }
    // Grupy w kolejności słownika; „Bez grupy" na końcu, tak jak w bibliotece.
    return [...byKey.values()].sort((a, b) => {
      if (a.key === '') return 1;
      if (b.key === '') return -1;
      return (categories.get(a.key)?.sortOrder ?? 0) - (categories.get(b.key)?.sortOrder ?? 0);
    });
  }, [items, libraryById, categories]);

  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const enabled = groups.reduce(
    (sum, group) => sum + group.rows.filter((row) => row.proposed.enabled).length,
    0,
  );

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="label-caps text-ink-soft">{pl.ai.brief.scope}</h3>
        {total > 0 ? (
          <span className="text-ink-soft tabular text-xs">
            {pl.ai.brief.scopeSummary(enabled, total)}
          </span>
        ) : null}
      </div>

      {total === 0 ? (
        <p className="text-ink-soft mt-2 text-sm">{pl.ai.brief.noItems}</p>
      ) : (
        <div className="mt-2 space-y-4">
          {groups.map((group) => (
            <div key={group.key || 'none'}>
              <p className="text-ink-faint text-xs font-medium">{group.label}</p>
              <ul className="mt-1">
                {group.rows.map(({ proposed, item }) => (
                  <ItemRow
                    key={item.id}
                    proposed={proposed}
                    item={item}
                    currency={currency}
                    onToggle={onToggle}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function priceLabel(item: LibraryItem, currency: string): string {
  const choice = pricingChoiceFor(item.pricing.mode, item.unit, item.unitPriceCents);
  if (choice === 'individual' || item.unitPriceCents === null) return pl.ai.brief.individual;
  return `${formatMoney(item.unitPriceCents, currency)} · ${pricingChoiceWords(choice, item.unitLabel)}`;
}

function ItemRow({
  proposed,
  item,
  currency,
  onToggle,
}: {
  proposed: BriefProposalItem;
  item: LibraryItem;
  currency: string;
  onToggle: (libraryItemId: string, enabled: boolean) => void;
}) {
  const id = `proposal-item-${item.id}`;
  return (
    <li
      className={cn(
        'border-hair flex items-start gap-3 border-b py-2.5 transition-opacity duration-150 ease-out',
        !proposed.enabled && 'opacity-70',
      )}
    >
      <Checkbox
        id={id}
        checked={proposed.enabled}
        onCheckedChange={(checked) => onToggle(item.id, checked === true)}
        aria-label={item.name}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-ink cursor-pointer text-sm font-medium">
            {item.name}
          </label>
          <span className="text-ink-soft tabular shrink-0 text-xs">
            {priceLabel(item, currency)}
          </span>
        </div>
        <p className="text-ink-faint text-xs">
          {proposed.enabled ? pl.ai.brief.enabled : pl.ai.brief.disabled}
        </p>
        {proposed.reason ? <p className="text-ink-soft mt-1 text-xs">{proposed.reason}</p> : null}
      </div>
    </li>
  );
}
