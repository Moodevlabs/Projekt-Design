import { AlertCircle } from 'lucide-react';

import type { AiError } from '@/data/repos/ai.repo';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import { aiErrorMessage } from './ai-error-message';

/**
 * Błąd asystenta w miejscu, gdzie użytkownik czekał na wynik.
 *
 * Inline, nie toast: błąd limitu albo odmowy to informacja, nad którą trzeba
 * się zatrzymać („odnowi się 1 listopada"), a toast znika, zanim człowiek
 * skończy czytać.
 */
export function AiErrorNote({
  error,
  onRetry,
  className,
}: {
  error: AiError;
  onRetry?: () => void;
  className?: string;
}) {
  const retryable =
    error.code === 'upstream' ||
    error.code === 'network' ||
    error.code === 'timeout' ||
    error.code === 'invalid_output';

  return (
    <div
      role="alert"
      className={cn(
        'bg-danger-wash text-ink flex items-start gap-3 rounded-[var(--radius-control)] px-4 py-3 text-sm',
        className,
      )}
    >
      <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p>{aiErrorMessage(error)}</p>
        {retryable && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-ink mt-1 text-sm font-medium underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 active:scale-[0.98]"
          >
            {pl.ai.retry}
          </button>
        ) : null}
      </div>
    </div>
  );
}
