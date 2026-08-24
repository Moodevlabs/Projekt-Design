import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyInput } from '../components/MoneyInput';
import { CsvImportDialog } from './CsvImportDialog';
import { CardsSkeleton, LoadError } from '../components/LibraryStates';
import { useLibraryItems, useUpdateLibraryItem } from '@/data/queries/useLibrary';
import { useRoomTypes } from '@/data/queries/useRoomTypes';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { PricingRule } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/** Reguła parametryczna — tylko takie mają co pokazać w macierzy. */
type Parametric = Extract<PricingRule, { mode: 'per_room' } | { mode: 'per_frame' }>;

const isParametric = (pricing: PricingRule): pricing is Parametric => pricing.mode !== 'flat';

/**
 * Macierz cennika: pozycje w wierszach, typy pomieszczeń w kolumnach.
 *
 * To ten sam cennik, który edytuje się na karcie pozycji — ale widziany tak,
 * jak trzyma go w arkuszu klient. Przy przenoszeniu cennika z Excela chodzenie
 * po kartach po jednej pozycji byłoby nie do zniesienia.
 *
 * Bez `@tanstack/react-table`: to kilkanaście kolumn i kilkadziesiąt wierszy,
 * a nie wirtualizowana siatka — zwykła tabela wystarcza.
 */
export function PricingMatrixTab() {
  const items = useLibraryItems();
  const roomTypes = useRoomTypes();
  const updateItem = useUpdateLibraryItem();
  const [onlyParametric, setOnlyParametric] = useState(true);

  const types = roomTypes.data ?? [];
  const rows = useMemo(() => {
    const all = items.data ?? [];
    return onlyParametric ? all.filter((item) => isParametric(item.pricing)) : all;
  }, [items.data, onlyParametric]);

  /**
   * Zapis komórki. Pozycja stałocenowa staje się `per_room` dopiero wtedy, gdy
   * ktoś faktycznie wpisze jej stawkę — inaczej samo otwarcie macierzy
   * zmieniłoby sposób wyceny wszystkich pozycji.
   */
  const patchPricing = (item: LibraryItem, change: (pricing: Parametric) => Parametric) => {
    const current: Parametric = isParametric(item.pricing)
      ? item.pricing
      : {
          mode: 'per_room',
          // `null` (wycena indywidualna) nie ma czego wniesc do macierzy.
          baseCents: item.unitPriceCents ?? 0,
          perRoomCents: {},
          defaultPerRoomCents: 0,
          roomScope: 'all',
        };

    updateItem.mutate({ id: item.id, patch: { pricing: change(current) } });
  };

  if (items.isError || roomTypes.isError) {
    return <LoadError onRetry={() => void items.refetch()} />;
  }

  if (items.isLoading || roomTypes.isLoading) return <CardsSkeleton count={2} />;

  if (types.length === 0) {
    return <p className="text-ink-soft text-sm">{pl.library.matrixNoRoomTypes}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-soft text-sm">{pl.library.matrixHint}</p>
        <div className="flex items-center gap-3">
          <label className="text-ink-soft flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={onlyParametric}
              onChange={(event) => setOnlyParametric(event.target.checked)}
            />
            {pl.library.matrixOnlyParametric}
          </label>
          <CsvImportDialog items={items.data ?? []} roomTypes={types} />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-ink-soft text-sm">{pl.library.matrixEmpty}</p>
      ) : (
        // Wąskie okno nie może rozpychać strony — przewija się sama tabela.
        <div className="border-hair overflow-x-auto rounded-[var(--radius-card)] border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">{pl.library.matrixColumnItem}</TableHead>
                <TableHead className="text-right">{pl.library.matrixColumnBase}</TableHead>
                {types.map((type) => (
                  <TableHead key={type.id} className="text-right">
                    {type.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">{pl.library.matrixColumnDefault}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((item) => {
                const pricing = isParametric(item.pricing) ? item.pricing : null;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>

                    <TableCell className="text-right">
                      <MoneyInput
                        cents={pricing?.baseCents ?? item.unitPriceCents ?? 0}
                        onChange={(baseCents) =>
                          patchPricing(item, (current) => ({ ...current, baseCents }))
                        }
                        ariaLabel={pl.library.matrixBaseCell(item.name)}
                        className="ml-auto w-28"
                      />
                    </TableCell>

                    {types.map((type) => (
                      <TableCell key={type.id} className="text-right">
                        <MoneyInput
                          // Brak wpisu znaczy „stawka domyślna” — pokazujemy to,
                          // co faktycznie się policzy.
                          cents={pricing?.perRoomCents[type.id] ?? pricing?.defaultPerRoomCents ?? 0}
                          onChange={(cents) =>
                            patchPricing(item, (current) => ({
                              ...current,
                              perRoomCents: { ...current.perRoomCents, [type.id]: cents },
                            }))
                          }
                          ariaLabel={pl.library.matrixCell(item.name, type.name)}
                          className="ml-auto w-28"
                        />
                      </TableCell>
                    ))}

                    <TableCell className="text-right">
                      <MoneyInput
                        cents={pricing?.defaultPerRoomCents ?? 0}
                        onChange={(defaultPerRoomCents) =>
                          patchPricing(item, (current) => ({ ...current, defaultPerRoomCents }))
                        }
                        ariaLabel={pl.library.matrixDefaultCell(item.name)}
                        className="ml-auto w-28"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
