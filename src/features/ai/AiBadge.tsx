import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import { AiMark } from './AiMark';

/**
 * Etykieta „Propozycja" ze znakiem asystenta — stoi przy każdej treści,
 * która wyszła z modelu i czeka na zatwierdzenie (FEATURES-AI.md, reguła A3).
 *
 * Celowo cicha: etykieta wersalikowa w `--ink-soft` z monogramem, bez tła
 * i bez koloru akcentu. Propozycja ma wyglądać jak notatka na marginesie,
 * nie jak alert — użytkownik ma ją przeczytać i zdecydować, a nie reagować.
 * Słowo „AI" niesie znak, więc tekst mówi tylko „Propozycja" — bez dublowania.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span className={cn('label-caps text-ink-soft inline-flex items-center gap-1.5', className)}>
      <AiMark size="xs" />
      {pl.ai.badge}
    </span>
  );
}
