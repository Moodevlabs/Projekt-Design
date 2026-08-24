import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRenameFile } from '@/data/queries/useFiles';
import type { StoredFile } from '@/domain/files/schema';
import { pl } from '@/i18n/pl';

/**
 * Zmiana nazwy widocznej.
 *
 * Obiekt w Storage zostaje pod swoją ścieżką — to klucz, nie etykieta.
 * Dzięki temu zmiana nazwy jest jednym UPDATE-em, a nie kopiowaniem bajtów,
 * i nie może zostawić pliku w połowie przeniesionego.
 */
export function RenameFileDialog({
  file,
  open,
  onOpenChange,
}: {
  file: StoredFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(file.name);
  const rename = useRenameFile();

  useEffect(() => {
    if (open) setName(file.name);
  }, [open, file.name]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === file.name) {
      onOpenChange(false);
      return;
    }

    rename.mutate(
      { id: file.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success(pl.files.renamed);
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.files.renameTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="file-name">{pl.files.renameLabel}</Label>
          <Input
            id="file-name"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {pl.common.cancel}
          </Button>
          <Button onClick={submit} disabled={rename.isPending}>
            {pl.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
