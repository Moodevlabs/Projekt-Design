import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateDocSet } from '@/data/queries/useLibraryDocGroups';
import { parseDocLibrarySetItems } from '@/domain/library/doc-groups';
import type { DocLibraryKind } from '@/domain/library/doc-entries';
import { pl } from '@/i18n/pl';

/**
 * „Zapisz jako zestaw" dla terminu, etapów współpracy i cennika (T-122).
 *
 * Bliźniak `SaveGroupToSetButton` z wyceny i ta sama zasada: zestaw ma
 * powstawać z pracy, którą ktoś i tak wykonał — rozpisałeś termin dla jednego
 * projektu, zapisujesz go jako „Pełny proces" i następnym razem wstawiasz
 * jednym kliknięciem. Ręczne składanie zestawu w bibliotece, wpis po wpisie,
 * jest teoretycznie możliwe i praktycznie nikt tego nie robi.
 *
 * ⚠️ `entries` przychodzi jako `unknown[]` **celowo**. Każdy rodzaj dokumentu
 * ma inny kształt wiersza (`ScheduleStage`, `StageEntry`, `PriceListItem`),
 * a bramką jest `parseDocLibrarySetItems`: schematy payloadów są `omit`-ami
 * tych właśnie typów, więc zod obcina `id` i pola nienależące do szablonu,
 * a wiersz, którego nie da się odczytać, po prostu wypada. Typowanie tego
 * generykiem po trzech unijnych kształtach kosztowałoby więcej niż daje.
 */
export function SaveDocSetButton({
  kind,
  entries,
}: {
  kind: DocLibraryKind;
  entries: readonly unknown[];
}) {
  const create = useCreateDocSet(kind);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const items = parseDocLibrarySetItems(kind, [...entries]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    create.mutate(
      { name: trimmed, items },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          toast.success(pl.editor.docLibrary.saveSetDone(trimmed));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        // Pusty dokument nie jest zestawem — zapisany wróciłby jako pozycja
        // na liście, która po wstawieniu nie robi nic.
        disabled={items.length === 0}
        onClick={() => setOpen(true)}
      >
        <BookmarkPlus className="size-3.5" aria-hidden />
        {pl.editor.docLibrary.saveSet}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pl.editor.docLibrary.saveSetTitle}</DialogTitle>
            <DialogDescription>
              {pl.editor.docLibrary.saveSetHint(items.length)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <label htmlFor={`doc-set-name-${kind}`} className="text-ink text-sm font-medium">
              {pl.library.docs.sets.nameLabel}
            </label>
            <Input
              id={`doc-set-name-${kind}`}
              value={name}
              autoFocus
              placeholder={pl.editor.docLibrary.saveSetPlaceholder[kind]}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {pl.common.cancel}
            </Button>
            <Button type="button" disabled={!name.trim() || create.isPending} onClick={save}>
              {pl.common.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
