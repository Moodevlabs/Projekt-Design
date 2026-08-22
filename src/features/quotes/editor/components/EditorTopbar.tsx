import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Pencil } from 'lucide-react';
import { InlineText } from './InlineText';
import { SaveIndicator } from './SaveIndicator';
import { StatusMark } from '@/components/shared';
import { Button } from '@/components/ui/button';
import type { EditorMode, SaveState } from '../editor.store';
import type { QuoteStatus } from '@/domain/quote';
import { routes } from '@/app/routes';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

export function EditorTopbar({
  number,
  status,
  mode,
  saveState,
  lastSavedAt,
  onNumberChange,
  onModeChange,
  onRetry,
  onReload,
}: {
  number: string | null;
  status: QuoteStatus;
  mode: EditorMode;
  saveState: SaveState;
  lastSavedAt: string | null;
  onNumberChange: (next: string) => void;
  onModeChange: (next: EditorMode) => void;
  onRetry: () => void;
  onReload: () => void;
}) {
  return (
    <div className="glass relative z-10 flex h-[68px] shrink-0 items-center gap-4 px-7">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={routes.quotes}>
          <ArrowLeft className="size-4" aria-hidden />
          {pl.editor.backToList}
        </Link>
      </Button>

      <div className="flex min-w-0 items-center gap-3">
        <InlineText
          value={number ?? ''}
          onCommit={onNumberChange}
          placeholder={pl.quotes.noNumber}
          ariaLabel={pl.quotes.number}
          className="tabular w-52 rounded-[var(--radius-control)] px-2 py-1 text-sm font-medium hover:bg-white/60 focus:bg-white/70"
        />
        <StatusMark status={status} />
        <SaveIndicator
          state={saveState}
          lastSavedAt={lastSavedAt}
          onRetry={onRetry}
          onReload={onReload}
        />
      </div>

      <div className="ml-auto flex items-center rounded-[var(--radius-pill)] border border-white/60 bg-white/45 p-0.5">
        {(['edit', 'preview'] as const).map((value) => {
          const Icon = value === 'edit' ? Pencil : Eye;
          const label = value === 'edit' ? pl.editor.edit : pl.editor.preview;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              className={cn(
                'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-sm transition-colors',
                mode === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-ink-soft hover:text-ink',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
