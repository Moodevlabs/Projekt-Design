import { Sparkles } from 'lucide-react';

import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Znacznik „Propozycja AI" — stoi przy każdej treści, która wyszła z modelu
 * i czeka na zatwierdzenie (FEATURES-AI.md, reguła A3).
 *
 * Celowo cichy: etykieta wersalikowa w `--ink-soft` z ikoną, bez tła i bez
 * koloru akcentu. Propozycja ma wyglądać jak notatka na marginesie, nie jak
 * alert — użytkownik ma ją przeczytać i zdecydować, a nie reagować.
 */
export function AiBadge({ className }: { className?: string }) {
  return (
    <span className={cn('label-caps text-ink-soft inline-flex items-center gap-1.5', className)}>
      <Sparkles className="size-3" aria-hidden />
      {pl.ai.badge}
    </span>
  );
}
