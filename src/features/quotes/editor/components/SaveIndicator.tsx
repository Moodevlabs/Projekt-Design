import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import type { SaveState } from '../editor.store';
import { formatTime } from '@/lib/dates';
import { pl } from '@/i18n/pl';

/** Wskaźnik autozapisu przy numerze wyceny (05-UI §3). */
export function SaveIndicator({
  state,
  lastSavedAt,
  onRetry,
  onReload,
}: {
  state: SaveState;
  lastSavedAt: string | null;
  onRetry: () => void;
  onReload: () => void;
}) {
  if (state === 'saving') {
    return (
      <span className="text-ink-soft flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {pl.editor.saving}
      </span>
    );
  }

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-danger flex items-center gap-1.5 text-xs underline underline-offset-4"
      >
        <AlertCircle className="size-3.5" aria-hidden />
        {pl.editor.saveError}
      </button>
    );
  }

  if (state === 'conflict') {
    // Ponowienie zapisu nadpisałoby cudze zmiany — jedyne wyjście to przeładować.
    return (
      <button
        type="button"
        onClick={onReload}
        className="text-warning flex items-center gap-1.5 text-xs underline underline-offset-4"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        {pl.editor.reload}
      </button>
    );
  }

  if (state === 'saved' && lastSavedAt) {
    return (
      <span className="text-ink-soft flex items-center gap-1.5 text-xs">
        <Check className="size-3.5" aria-hidden />
        {pl.editor.saved} {formatTime(lastSavedAt)}
      </span>
    );
  }

  return null;
}
