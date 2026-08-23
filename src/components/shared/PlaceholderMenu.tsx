import { Braces } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PLACEHOLDER_HINTS } from '@/domain/quote';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Wstawianie placeholderów do pola tekstowego (F4.2).
 *
 * **Dokleja na końcu, nie w miejscu kursora.** Pola opisów trzymają własny
 * szkic i zatwierdzają go przy utracie ogniskowania — a otwarcie tego menu
 * właśnie ją zabiera. Udawanie, że wiemy, gdzie stał kursor, kończyłoby się
 * wstawianiem w losowe miejsce; doklejenie na końcu jest przewidywalne
 * i pokrywa typowy przypadek („Widoki ścian dla: " + `{rooms}`).
 */
export function PlaceholderMenu({
  value,
  onInsert,
  className,
}: {
  value: string;
  onInsert: (next: string) => void;
  className?: string;
}) {
  const insert = (token: string) => {
    // Spacja tylko wtedy, gdy jest po czym — inaczej puste pole zaczynałoby
    // się od spacji, a tekst zakończony spacją dostałby drugą.
    const separator = value.length > 0 && !value.endsWith(' ') ? ' ' : '';
    onInsert(`${value}${separator}${token}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={pl.editor.insertPlaceholder}
        title={pl.editor.insertPlaceholder}
        className={cn(
          'text-ink-soft hover:text-ink focus-visible:ring-ring inline-flex size-6 shrink-0',
          'items-center justify-center rounded-[var(--radius-control)]',
          'focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        <Braces className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-w-[320px]">
        <DropdownMenuLabel className="text-xs">{pl.editor.placeholdersTitle}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PLACEHOLDER_HINTS.map((hint) => (
          <DropdownMenuItem
            key={hint.token}
            onSelect={() => insert(hint.token)}
            className="flex-col items-start gap-0.5"
          >
            <code className="text-ink text-[12px]">{hint.token}</code>
            <span className="text-ink-soft text-[11px]">{hint.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
