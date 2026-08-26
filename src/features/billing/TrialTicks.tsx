import { trialTone } from './trial-tone';
import { cn } from '@/lib/utils';

/** Długość okresu próbnego. Zgodna z `trial_ends_at` ustawianym przy rejestracji. */
export const TRIAL_DAYS = 14;

/**
 * Zapas okresu próbnego jako **14 tyknięć-dni**, nie pasek postępu.
 *
 * Pasek pokazuje ułamek („62%"), a tu liczy się rzecz policzalna: ile dni
 * zostało. Tyknięcia dają się przelecieć wzrokiem i policzyć, a przy okazji
 * są echem kropek TAK/NIE z bilansu wyceny — ta sama rodzina znaków w całej
 * aplikacji.
 *
 * Barwa pozostałych tyknięć wędruje od oliwki przez ochrę do terakoty w miarę
 * kurczenia się zapasu (`trial-tone.ts`). Kolor jest **drugim** sygnałem obok
 * liczby dni w tekście, nigdy jedynym — stąd `aria-hidden`: dla czytnika
 * ekranu ta grafika nie niesie nic, czego nie ma w zdaniu obok.
 *
 * Komponent stoi w `billing`, a nie w `dashboard`, bo używają go oba miejsca:
 * karta na pulpicie i ekran subskrypcji. Kierunek zależności musi iść od
 * pulpitu do rozliczeń, nie odwrotnie.
 */
export function TrialTicks({ daysLeft, className }: { daysLeft: number; className?: string }) {
  const tone = trialTone(daysLeft, TRIAL_DAYS);

  return (
    <div aria-hidden className={cn('flex gap-1', className)}>
      {Array.from({ length: TRIAL_DAYS }, (_, index) => (
        <span
          key={index}
          style={index < daysLeft ? { backgroundColor: tone } : undefined}
          className={cn('h-1.5 flex-1 rounded-full', index >= daysLeft && 'bg-[var(--hair)]')}
        />
      ))}
    </div>
  );
}
