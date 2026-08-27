import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportClients } from '@/data/queries/useClients';
import { parseClientsCsv, type ImportResult } from '@/domain/client/import-csv';
import { openFilesDialog, readFile, runningInTauri } from '@/lib/tauri';
import { pl } from '@/i18n/pl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Import klientów z CSV (T-23).
 *
 * Dwa kroki, nie jeden: najpierw **podgląd** („znaleziono 128 klientów,
 * 3 wiersze bez nazwy"), dopiero potem zapis. Import kartoteki wykonany
 * jednym kliknięciem, bez pokazania co wejdzie, jest operacją, której nikt
 * przy zdrowych zmysłach nie chce cofać ręcznie.
 */
export function ImportClientsDialog({ open, onOpenChange }: Props) {
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useImportClients();

  const load = (content: string) => {
    const result = parseClientsCsv(content);
    if (result.rows.length === 0 && result.issues.length === 0) {
      toast.error(pl.clients.importEmpty);
      return;
    }
    setPreview(result);
  };

  const pick = async () => {
    // W Tauri dialog systemowy, w przeglądarce ukryty `<input type=file>` —
    // ta sama para co przy wrzucaniu plików (T-55).
    if (!runningInTauri()) {
      inputRef.current?.click();
      return;
    }
    const paths = await openFilesDialog();
    const first = paths[0];
    if (!first) return;
    const bytes = await readFile(first);
    load(new TextDecoder('utf-8').decode(bytes));
  };

  const commit = () => {
    if (!preview) return;
    importer.mutate(preview.rows, {
      onSuccess: (result) => {
        toast.success(pl.clients.imported(result.inserted, result.skipped));
        setPreview(null);
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPreview(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[520px]">
        <DialogHeader>
          <DialogTitle>{pl.clients.importTitle}</DialogTitle>
          <DialogDescription>{pl.clients.importDescription}</DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file.text().then(load);
            event.target.value = '';
          }}
        />

        {preview === null ? (
          <div className="space-y-3">
            <p className="text-ink-soft text-sm">{pl.clients.importColumns}</p>
            <Button onClick={() => void pick()}>
              <Upload className="size-4" aria-hidden />
              {pl.clients.importPick}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">{pl.clients.importFound(preview.rows.length)}</p>

            {preview.issues.length > 0 ? (
              <div className="border-warning/30 rounded-[var(--radius-control)] border p-3">
                <p className="text-warning text-sm">
                  {pl.clients.importIssues(preview.issues.length)}
                </p>
                <ul className="text-ink-soft mt-1 space-y-0.5 text-xs">
                  {preview.issues.slice(0, 5).map((issue) => (
                    <li key={`${issue.line}`}>
                      {pl.clients.importLine(issue.line)}:{' '}
                      {issue.reason === 'no_name'
                        ? pl.clients.importNoName
                        : pl.clients.importDuplicate}
                    </li>
                  ))}
                  {preview.issues.length > 5 ? (
                    <li>{pl.clients.importMore(preview.issues.length - 5)}</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {/* Trzy pierwsze wiersze zamiast całej listy: chodzi o sprawdzenie,
                czy kolumny trafiły tam, gdzie trzeba — a nie o przeglądanie
                importu przed importem. */}
            <ul className="border-hair-strong divide-hair divide-y rounded-[var(--radius-control)] border">
              {preview.rows.slice(0, 3).map((row, index) => (
                <li key={index} className="px-3 py-2 text-sm">
                  <span className="font-medium">{row.name}</span>
                  {row.phone ? <span className="text-ink-soft"> · {row.phone}</span> : null}
                  {row.city ? <span className="text-ink-soft"> · {row.city}</span> : null}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                {pl.common.cancel}
              </Button>
              <Button onClick={commit} disabled={importer.isPending || preview.rows.length === 0}>
                {importer.isPending
                  ? pl.clients.importing
                  : pl.clients.importConfirm(preview.rows.length)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
