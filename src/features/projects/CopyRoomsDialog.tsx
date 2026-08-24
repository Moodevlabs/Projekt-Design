import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { pl } from '@/i18n/pl';

export interface CopyRoomsDialogProps {
  open: boolean;
  /** Tytuł wyceny, z której bierzemy pomieszczenia — człowiek ma wiedzieć skąd. */
  fromTitle: string;
  roomsCount: number;
  onCopy: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

/**
 * „Skopiować pomieszczenia?" przy zakładaniu kolejnej wyceny w projekcie.
 *
 * Trzy wyjścia, nie dwa: **Skopiuj**, **Zacznij pusto** i zamknięcie okna.
 * `ConfirmDialog` się tu nie nadaje, bo jego „Anuluj" i krzyżyk to ta sama
 * akcja — a tutaj „nie kopiuj" znaczy „zakładaj dalej", natomiast krzyżyk
 * znaczy „rozmyśliłem się, nie zakładaj nic".
 */
export function CopyRoomsDialog({
  open,
  fromTitle,
  roomsCount,
  onCopy,
  onSkip,
  onCancel,
}: CopyRoomsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pl.projects.copyRoomsTitle}</DialogTitle>
          <DialogDescription>
            {pl.projects.copyRoomsDescription(roomsCount, fromTitle)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onSkip}>
            {pl.projects.copyRoomsSkip}
          </Button>
          <Button onClick={onCopy}>{pl.projects.copyRoomsConfirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
