import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { pricingChoiceWords, type LibraryImportItem } from '@/domain/ai';
import { categoryLabel, type LibraryCategory } from '@/domain/library/schema';
import { PRICING_CHOICES, type PricingChoiceId } from '@/domain/library/units';
import { formatMoney, parseMoney } from '@/domain/money';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import type { ProposalRow as RowModel } from './proposal-rows';

const NONE = 'none';

/** Wartość selekta grupy: istniejąca po `id`, nowa po nazwie, albo brak. */
function categoryValue(name: string | null, categories: readonly LibraryCategory[]): string {
  const trimmed = name?.trim();
  if (!trimmed) return NONE;
  const key = trimmed.toLocaleLowerCase('pl-PL');
  const known = categories.find(
    (category) => category.name.trim().toLocaleLowerCase('pl-PL') === key,
  );
  return known ? `cat:${known.id}` : `new:${trimmed}`;
}

/**
 * Jeden wiersz propozycji: checkbox, nazwa, grupa, sposób wyceny, cena, pewność.
 *
 * Wiersz `low` dostaje tło `--surface-2` — podświetlenie, nie alarm: pozycja
 * jest zaznaczona i wejdzie, ale warto na nią spojrzeć. Odznaczony wiersz
 * blednie, żeby na pierwszy rzut oka było widać, co wejdzie, a co nie.
 */
export function ProposalRow({
  row,
  categories,
  newCategories,
  onToggle,
  onChange,
}: {
  row: RowModel;
  categories: readonly LibraryCategory[];
  newCategories: readonly string[];
  onToggle: (selected: boolean) => void;
  onChange: (patch: Partial<LibraryImportItem>) => void;
}) {
  const { item } = row;
  const individual = item.pricingChoice === 'individual';
  // Tekst w polu ceny podczas edycji; `null` = pokazujemy sformatowaną kwotę.
  const [priceDraft, setPriceDraft] = useState<string | null>(null);

  const priceText =
    priceDraft ?? (item.unitPriceCents === null ? '' : formatMoney(item.unitPriceCents));

  const commitPrice = () => {
    if (priceDraft === null) return;
    const parsed = priceDraft.trim() === '' ? null : parseMoney(priceDraft);
    // Nieczytelny wpis wraca do poprzedniej wartości — milcząco, bo pole
    // samo pokazuje, co zostało.
    if (parsed === null && priceDraft.trim() !== '') {
      setPriceDraft(null);
      return;
    }
    onChange({ unitPriceCents: parsed === null ? null : Math.max(0, parsed) });
    setPriceDraft(null);
  };

  const selectCategory = (value: string) => {
    if (value === NONE) return onChange({ categoryName: null });
    if (value.startsWith('cat:')) {
      const category = categories.find((candidate) => `cat:${candidate.id}` === value);
      return onChange({ categoryName: category?.name ?? null });
    }
    onChange({ categoryName: value.slice('new:'.length) });
  };

  const currentCategory = categoryValue(item.categoryName, categories);
  const ownNew = currentCategory.startsWith('new:') ? currentCategory.slice(4) : null;
  const newOptions =
    ownNew && !newCategories.includes(ownNew) ? [...newCategories, ownNew] : newCategories;

  return (
    <TableRow
      data-confidence={item.confidence}
      className={cn(
        'transition-opacity duration-150 ease-out',
        item.confidence === 'low' && 'bg-surface-2',
        !row.selected && 'opacity-60',
      )}
    >
      <TableCell className="pt-3 pr-0 align-top">
        <Checkbox
          checked={row.selected}
          onCheckedChange={(checked) => onToggle(checked === true)}
          aria-label={item.name}
        />
      </TableCell>

      <TableCell className="min-w-0 align-top">
        <Input
          value={item.name}
          onChange={(event) => onChange({ name: event.target.value })}
          aria-label={pl.ai.import.columns.name}
          className="h-8 text-sm"
        />
        {row.alreadyHave || item.description ? (
          <p className="text-ink-faint mt-1 truncate text-xs" title={item.description || undefined}>
            {row.alreadyHave ? (
              <span className="text-ink-soft font-medium">{pl.ai.import.alreadyHave}</span>
            ) : null}
            {row.alreadyHave && item.description ? ' · ' : null}
            {item.description}
          </p>
        ) : null}
      </TableCell>

      <TableCell className="align-top">
        <Select value={currentCategory} onValueChange={selectCategory}>
          <SelectTrigger size="sm" className="w-full" aria-label={pl.ai.import.columns.category}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{pl.ai.import.noCategory}</SelectItem>
            {categories.length > 0 ? <SelectSeparator /> : null}
            {categories.map((category) => (
              <SelectItem key={category.id} value={`cat:${category.id}`}>
                {categoryLabel(category)}
              </SelectItem>
            ))}
            {newOptions.length > 0 ? <SelectSeparator /> : null}
            {newOptions.map((name) => (
              <SelectItem key={`new:${name}`} value={`new:${name}`}>
                {pl.ai.import.newCategory}: {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="align-top">
        <div className="space-y-1">
          <Select
            value={item.pricingChoice}
            onValueChange={(value) => onChange({ pricingChoice: value as PricingChoiceId })}
          >
            <SelectTrigger size="sm" className="w-full" aria-label={pl.ai.import.columns.pricing}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICING_CHOICES.map((choice) => (
                <SelectItem key={choice.id} value={choice.id}>
                  {pricingChoiceWords(choice.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {item.pricingChoice === 'flat_custom' ? (
            <Input
              value={item.unitLabel ?? ''}
              onChange={(event) => onChange({ unitLabel: event.target.value })}
              placeholder={pl.ai.import.unitLabelPlaceholder}
              aria-label={pl.ai.import.unitLabelPlaceholder}
              className="h-8 text-sm"
            />
          ) : null}
        </div>
      </TableCell>

      <TableCell className="align-top">
        <Input
          value={individual ? '' : priceText}
          disabled={individual}
          placeholder={pl.ai.import.priceIndividual}
          inputMode="decimal"
          onFocus={() =>
            setPriceDraft(item.unitPriceCents === null ? '' : String(item.unitPriceCents / 100))
          }
          onChange={(event) => setPriceDraft(event.target.value)}
          onBlur={commitPrice}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-label={pl.ai.import.columns.price}
          className="tabular h-8 text-right text-sm"
        />
        {item.minPriceCents !== null ? (
          <p className="text-ink-faint tabular mt-1 text-right text-xs">
            {pl.ai.import.fromPrice(formatMoney(item.minPriceCents))}
          </p>
        ) : null}
      </TableCell>

      <TableCell
        className="text-ink-faint pt-3 align-top text-xs"
        title={item.sourceNote || undefined}
      >
        {pl.ai.import.confidence[item.confidence]}
      </TableCell>
    </TableRow>
  );
}
