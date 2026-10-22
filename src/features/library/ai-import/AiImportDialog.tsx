import { useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AiImportBody, type AiImportStatus } from './AiImportBody';

/**
 * Import usług z pliku przez asystenta (T-136, FEATURES-AI.md §2).
 *
 * Powłoka jest celowo głupia: cały stan (hooki mutacji, propozycja, wiersze)
 * żyje w `AiImportBody`, które Radix montuje dopiero po otwarciu. Dzięki temu
 * zamknięty dialog nie trzyma żadnej mutacji ani nie woła `useMutation`
 * w zakładce, a kolejne otwarcie zaczyna od czystej strefy upuszczania —
 * bez ręcznego `reset()`.
 *
 * Dialog nie zamyka się w trakcie zapisu — przerwanie w połowie zostawiłoby
 * bibliotekę z częścią wpisów i bez informacji, która to część.
 */
export function AiImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<AiImportStatus>({ wide: false, locked: false });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && status.locked) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!status.locked}
        className={cn(
          'transition-[max-width] duration-200 ease-out',
          status.wide ? 'sm:max-w-4xl' : 'sm:max-w-lg',
        )}
        onInteractOutside={(event) => {
          if (status.locked) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (status.locked) event.preventDefault();
        }}
      >
        <AiImportBody open={open} onStatus={setStatus} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
