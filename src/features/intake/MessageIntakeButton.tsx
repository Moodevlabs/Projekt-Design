import { useState, type ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import type { Client } from '@/domain/client/schema';
import { AiMark } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { MessageIntakeDialog } from './MessageIntakeDialog';

/**
 * Wejście „Z wiadomości" — przycisk ze znakiem asystenta i dialog montowany
 * dopiero po kliknięciu (wzorzec `CommentAiAction`): zamknięty pytałby
 * o bibliotekę, szablony i limit asystenta przy każdym wejściu na pulpit.
 *
 * Jeden komponent dla trzech miejsc (pulpit, pusty stan, karta klienta),
 * żeby przycisk wyglądał wszędzie tak samo — wariant i rozmiar ustawia
 * miejsce użycia, treść i znak są stałe.
 */
export function MessageIntakeButton({
  knownClient = null,
  variant = 'outline',
  size,
  className,
}: {
  knownClient?: Client | null;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <AiMark size="xs" />
        {pl.ai.intake.action}
      </Button>
      {open ? (
        <MessageIntakeDialog knownClient={knownClient} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
