import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUpdateLibraryItem } from '@/data/queries/useLibrary';
import type { LibraryItem } from '@/data/repos/library.repo';
import type { RoomType } from '@/data/repos/room-types.repo';
import { parsePricingCsv, type CsvPricingImport } from '@/domain/library/csv';
import { buildPricingFromCsv, matchCsvRows } from './csv-apply';
import { pl } from '@/i18n/pl';

/**
 * Import macierzy z pliku. Świadomie **dwuetapowy**: najpierw pokazujemy, co
 * się dopasowało i co odpadło, a zapis leci dopiero po potwierdzeniu. Cennik to
 * dane, które user wpisywał godzinami — nadpisanie ich bez podglądu byłoby
 * najgorszym możliwym zachowaniem tego ekranu.
 */
export function CsvImportDialog({
  items,
  roomTypes,
}: {
  items: LibraryItem[];
  roomTypes: RoomType[];
}) {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<CsvPricingImport | null>(null);
  const updateItem = useUpdateLibraryItem();

  const matched = parsed ? matchCsvRows(parsed.rows, items) : null;

  const reset = () => setParsed(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setParsed(parsePricingCsv(text, roomTypes.map((type) => type.slug)));
  };

  const apply = () => {
    if (!matched) return;

    for (const { row, item } of matched.matched) {
      updateItem.mutate({
        id: item.id,
        patch: { pricing: buildPricingFromCsv(row, item, roomTypes) },
      });
    }

    toast.success(pl.library.importCsvDone(matched.matched.length));
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Upload className="size-4" aria-hidden />
          {pl.library.importCsv}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pl.library.importCsvTitle}</DialogTitle>
          <DialogDescription>{pl.library.importCsvHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            aria-label={pl.library.importCsvFile}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="text-sm"
          />

          {parsed && matched ? (
            <div className="space-y-1.5 text-sm">
              <p className="text-ink">{pl.library.importCsvMatched(matched.matched.length)}</p>

              {matched.unmatched.length > 0 ? (
                <p className="text-ink-soft">
                  {pl.library.importCsvUnmatched(matched.unmatched.map((row) => row.name))}
                </p>
              ) : null}

              {parsed.unknownSlugs.length > 0 ? (
                <p className="text-ink-soft">
                  {pl.library.importCsvUnknownColumns(parsed.unknownSlugs)}
                </p>
              ) : null}

              {parsed.problems.map((problem) => (
                <p key={`${problem.line}-${problem.message}`} className="text-discount">
                  {pl.library.importCsvProblem(problem.line, problem.message)}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {pl.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!matched || matched.matched.length === 0}
            onClick={apply}
          >
            {pl.library.importCsvApply}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
