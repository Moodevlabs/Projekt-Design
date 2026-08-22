import { cn } from '@/lib/utils';
import { pl } from '@/i18n/pl';
import type { NudgeDirection } from '@/domain/quote';

/**
 * Przyciski góra/dół — druga, w pełni klawiaturowa droga do zmiany kolejności.
 * Przeciąganie bywa niewykonalne (tablet, trackpad, ograniczona motoryka),
 * więc te dwa przyciski nie są ozdobą, tylko równorzędną ścieżką.
 *
 * Na krańcach listy są wyłączone — `opacity`, nie `cursor: not-allowed`
 * (za prototypem: kursor „zakaz" sugeruje błąd, a to po prostu koniec listy).
 */
export function MoveButtons({
  label,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  label: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: NudgeDirection) => void;
}) {
  return (
    <span className="flex shrink-0 flex-col gap-0.5">
      <Arrow
        direction="up"
        label={`${pl.editor.moveUp}: ${label}`}
        disabled={!canMoveUp}
        onClick={() => onMove('up')}
      />
      <Arrow
        direction="down"
        label={`${pl.editor.moveDown}: ${label}`}
        disabled={!canMoveDown}
        onClick={() => onMove('down')}
      />
    </span>
  );
}

function Arrow({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: NudgeDirection;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-[18px] items-center justify-center rounded-[4px] border text-[7px] leading-none',
        'border-[var(--doc-hair)] text-[var(--doc-ink-soft)] transition-colors',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        disabled
          ? 'cursor-default opacity-30'
          : 'hover:border-[var(--doc-sage)] hover:bg-[var(--doc-sage-light)] hover:text-[var(--doc-sage)]',
      )}
    >
      <span aria-hidden>{direction === 'up' ? '▲' : '▼'}</span>
    </button>
  );
}
