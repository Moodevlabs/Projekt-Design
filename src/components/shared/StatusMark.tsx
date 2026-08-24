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
 * Dwa niezależne kanały informacji: **liczba odcinków** to postęp, a **barwa**
 * to kondycja oferty (bursztyn = jeszcze u nas, zieleń = u klienta, im ciemniejsza
 * tym bliżej domknięcia). Kolor jest wzmocnieniem, nie jedynym nośnikiem — sam
 * układ odcinków i słowo obok wystarczą osobie nierozróżniającej barw, dlatego
 * napis zostaje neutralny i nie traci kontrastu.
 */

type Segment = 'filled' | 'hollow' | 'empty';

interface StatusVisual {
  segments: [Segment, Segment, Segment];
  /** Kolor wypełnionych odcinków. */
  color: string;
  /** Stan zamknięty bez sukcesu — cały znacznik przygasa. */
  muted?: boolean;
  strong?: boolean;
}

const VISUALS: Record<QuoteStatus, StatusVisual> = {
  // Jeszcze u nas — bursztyn.
  draft: { segments: ['filled', 'empty', 'empty'], color: 'var(--status-draft)' },
  // Poszła do klienta — jasna zieleń.
  sent: { segments: ['filled', 'filled', 'empty'], color: 'var(--status-sent)' },
  // Domknięta — pełne trzy odcinki w ciemniejszej zieleni, napis w atramencie.
  accepted: {
    segments: ['filled', 'filled', 'filled'],
    color: 'var(--status-accepted)',
    strong: true,
  },
  // Dwa stany bez domknięcia: doszły do klienta, ale trzeci odcinek został pusty.
  rejected: {
    segments: ['filled', 'filled', 'hollow'],
    color: 'var(--status-rejected)',
    muted: true,
  },
  expired: {
    segments: ['filled', 'filled', 'hollow'],
    color: 'var(--status-expired)',
    muted: true,
  },
  /*
   * Archiwalna NIE jest etapem w ciągu szkic → wysłana → rozstrzygnięcie
   * (§9.10). To wersja, którą zastąpiła nowsza — postęp nic tu nie znaczy,
   * więc tor zostaje pusty i wygaszony, a informację niesie sama etykieta.
   */
  archived: {
    segments: ['empty', 'empty', 'empty'],
    color: 'var(--status-expired)',
    muted: true,
  },
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
            style={
              segment === 'filled'
                ? { backgroundColor: visual.color }
                : segment === 'hollow'
                  ? { boxShadow: `inset 0 0 0 1px ${visual.color}`, opacity: 0.45 }
                  : undefined
            }
            className={cn(
              'block h-[3px] w-3.5 rounded-full',
              segment === 'empty' && 'bg-ink/12',
              visual.muted && segment === 'filled' && 'opacity-80',
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
