import { useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { LibraryImportItem } from '@/domain/ai';
import type { LibraryCategory } from '@/domain/library/schema';
import { pl } from '@/i18n/pl';
import { ProposalRow } from './ProposalRow';
import { proposedNewCategories, type ProposalRow as RowModel } from './proposal-rows';

/**
 * Krok 2: tabela propozycji do przejrzenia (reguła A3 — nic nie wchodzi
 * bez zaznaczenia). Edycja wprost w wierszu, bez osobnego formularza:
 * poprawka nazwy albo ceny w trzydziestu wierszach ma być trzydziestoma
 * kliknięciami, nie sześćdziesięcioma.
 */
export function ProposalTable({
  rows,
  categories,
  warnings,
  onToggle,
  onToggleAll,
  onChange,
}: {
  rows: readonly RowModel[];
  categories: readonly LibraryCategory[];
  warnings: readonly string[];
  onToggle: (index: number, selected: boolean) => void;
  onToggleAll: (selected: boolean) => void;
  onChange: (index: number, patch: Partial<LibraryImportItem>) => void;
}) {
  const selectedCount = rows.filter((row) => row.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const newCategories = useMemo(
    () =>
      proposedNewCategories(
        rows,
        categories.map((category) => category.name),
      ),
    [rows, categories],
  );

  return (
    <div className="space-y-3">
      <div className="card-surface max-h-[55vh] overflow-auto">
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-9">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onToggleAll(checked === true)}
                  aria-label={pl.ai.import.selectAll}
                />
              </TableHead>
              <TableHead className="w-[32%]">{pl.ai.import.columns.name}</TableHead>
              <TableHead className="w-[20%]">{pl.ai.import.columns.category}</TableHead>
              <TableHead className="w-[20%]">{pl.ai.import.columns.pricing}</TableHead>
              <TableHead className="w-[16%] text-right">{pl.ai.import.columns.price}</TableHead>
              <TableHead className="w-[12%]">{pl.ai.import.columns.confidence}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <ProposalRow
                key={row.index}
                row={row}
                categories={categories}
                newCategories={newCategories}
                onToggle={(selected) => onToggle(row.index, selected)}
                onChange={(patch) => onChange(row.index, patch)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
        <p className="text-ink-soft tabular">
          {pl.ai.import.selectedCount(selectedCount, rows.length)}
        </p>
        {warnings.length > 0 ? (
          <div className="text-ink-soft max-w-prose">
            <p className="label-caps text-ink-faint mb-1">{pl.ai.import.warnings}</p>
            <ul className="space-y-0.5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
