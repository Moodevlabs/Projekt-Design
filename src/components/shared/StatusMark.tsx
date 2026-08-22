import type { QuoteStatus } from '@/domain/quote/schema';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';

/**
 * Znacznik statusu wyceny.
 *
 * Świadomie NIE jest to kolorowa pigułka. Status wyceny to nie etykieta z
 * chmury tagów, tylko **pozycja w ciągu**: szkic → wysłana → rozstrzygnięcie.
 * Pigułka pokazuje pięć równorzędnych stanów; trzyodcinkowy tor pokazuje,
 * jak daleko zaszła oferta — i w kolumnie tabeli daje się skanować pionowo.
 *
 * Kolor nie niesie tu żadnej informacji, więc go nie ma. Znaczenie niosą:
 * wypełnienie odcinków (postęp), grubość napisu (waga stanu) i samo słowo,
 * które jako jedyne rozróżnia „odrzuconą" od „wygasłej". Działa też dla osób
 * nierozróżniających barw.
 */

type Segment = 'filled' | 'hollow' | 'empty';

interface StatusVisual {
  segments: [Segment, Segment, Segment];
  /** Stan zamknięty bez sukcesu — cały znacznik przygasa. */
  muted?: boolean;
  strong?: boolean;
}

const VISUALS: Record<QuoteStatus, StatusVisual> = {
  draft: { segments: ['filled', 'empty', 'empty'] },
  sent: { segments: ['filled', 'filled', 'empty'] },
  // Jedyny stan, w którym oferta doszła do końca — jedyny w pełnym atramencie.
  accepted: { segments: ['filled', 'filled', 'filled'], strong: true },
  rejected: { segments: ['filled', 'filled', 'hollow'], muted: true },
  expired: { segments: ['filled', 'filled', 'hollow'], muted: true },
};

export function StatusMark({
  status,
  className,
}: {
  status: QuoteStatus;
  className?: string;
}) {
  const visual = VISUALS[status];

  return (
    <span
      className={cn('inline-flex items-center gap-2.5 whitespace-nowrap', className)}
      title={pl.status[status]}
    >
      <span aria-hidden className="flex items-center gap-[3px]">
        {visual.segments.map((segment, index) => (
          <span
            key={index}
            className={cn(
              'block h-[3px] w-3.5 rounded-full',
              segment === 'filled' && (visual.strong ? 'bg-ink' : 'bg-ink/55'),
              segment === 'hollow' && 'ring-ink/25 bg-transparent ring-1 ring-inset',
              segment === 'empty' && 'bg-ink/12',
              visual.muted && 'opacity-70',
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          'text-[12.5px] leading-none',
          visual.strong ? 'text-ink font-semibold' : 'text-ink-soft font-medium',
          visual.muted && 'text-ink-soft/75',
        )}
      >
        {pl.status[status]}
      </span>
    </span>
  );
}
