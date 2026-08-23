import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { availableDocs, type PackageContents, type PackageDocKind } from '@/pdf/package-plan';
import { pl } from '@/i18n/pl';

/**
 * Dialog „Eksportuj pakiet dokumentów" (F6.3).
 *
 * Lista pokazuje **tylko dokumenty, które ta wycena ma**. Checkbox „Termin",
 * którego nie da się zaznaczyć, to pytanie bez odpowiedzi — brak pozycji mówi
 * to samo, nie zajmując miejsca ani uwagi.
 */
export function ExportPackageDialog({
  open,
  onOpenChange,
  contents,
  exporting,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contents: PackageContents;
  exporting: boolean;
  onExport: (selected: PackageDocKind[], single: boolean) => void;
}) {
  const dostepne = availableDocs(contents);
  const [selected, setSelected] = useState<PackageDocKind[]>(dostepne);
  const [single, setSingle] = useState(true);

  useEffect(() => {
    // Po otwarciu zaznaczamy wszystko, co jest — pakiet to domyslnie CALOSC,
    // a odznaczenie jest swiadoma decyzja. `open` w zaleznosciach, zeby
    // dokument dolozony miedzy jednym a drugim eksportem tez sie zlapal.
    if (open) setSelected(availableDocs(contents));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contents.hasSchedule, contents.hasStages, contents.hasPriceList]);

  const toggle = (kind: PackageDocKind) =>
    setSelected((prev) =>
      prev.includes(kind) ? prev.filter((item) => item !== kind) : [...prev, kind],
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.pdf.packageTitle}</DialogTitle>
          <DialogDescription>{pl.pdf.packageIntro}</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2.5">
          {dostepne.map((kind) => (
            <li key={kind}>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(kind)}
                  onChange={() => toggle(kind)}
                  className="size-4 shrink-0 accent-[var(--doc-sage)]"
                />
                {pl.pdf.packageDoc[kind]}
              </label>
            </li>
          ))}
        </ul>

        <div className="border-hair mt-1 flex items-start gap-3 border-t pt-4">
          <Switch
            id="package-single"
            checked={single}
            onCheckedChange={setSingle}
            aria-label={pl.pdf.packageSingle}
          />
          <label htmlFor="package-single" className="text-sm">
            {pl.pdf.packageSingle}
            <span className="text-ink-soft mt-0.5 block text-xs">
              {single ? pl.pdf.packageSingleHint : pl.pdf.packageSeparateHint}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button
            onClick={() => onExport(selected, single)}
            disabled={exporting || selected.length === 0}
          >
            {pl.pdf.packageExport}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
