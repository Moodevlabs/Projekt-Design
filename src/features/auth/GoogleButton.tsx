import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { signInWithGoogle } from './oauth';
import { pl } from '@/i18n/pl';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');

export function GoogleButton({ disabled }: { disabled?: boolean }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
      onClick={() => {
        setPending(true);
        signInWithGoogle()
          .catch((error: unknown) => {
            log.error('Logowanie Google nieudane', error);
            toast.error(pl.errors.generic);
          })
          .finally(() => setPending(false));
      }}
    >
      <GoogleMark />
      {pl.auth.google}
    </Button>
  );
}

/**
 * ⚠️ Cztery hexy w tym znaku to **barwy marki Google** i nie wolno ich
 * przestrajać do palety Toolier — wytyczne Google zabraniają przemalowania
 * logo. To jedyne miejsce w aplikacji, gdzie zahardkodowany kolor jest
 * poprawny; sweep szukający hexów ma je ominąć, a nie „naprawić".
 */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.4 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
