import { AlertCircle } from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { AiErrorNote, AiWorking } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { cn } from '@/lib/utils';
import { MESSAGE_LIMIT, type MessageIntakeState } from './useMessageIntake';

/** Od tej części limitu licznik jest widoczny — wcześniej byłby szumem. */
const COUNTER_FROM = 0.8;

/**
 * Krok 1 — wklejona wiadomość.
 *
 * Jedno pole i nic więcej: człowiek wkleja mail i klika. Licznik znaków
 * pojawia się dopiero, gdy limit jest realnie blisko; komunikat o
 * przekroczeniu stoi pod polem, a przycisk w stopce jest wtedy wyłączony.
 * Błąd asystenta pokazujemy NAD polem, bo odpowiedzią na „odmówił" jest
 * zwykle poprawienie tekstu, nie samo ponowienie.
 */
export function IntakeSource({ state }: { state: MessageIntakeState }) {
  if (state.analyzing) {
    return (
      <AiWorking label={pl.ai.intake.analyzing} hint={pl.ai.workingHint} showElapsed rows={4} />
    );
  }

  const showCounter = state.chars >= MESSAGE_LIMIT * COUNTER_FROM;

  return (
    <div className="space-y-3">
      {state.prerequisiteError && !state.loaded ? (
        // Błąd danych wstępnych, nie asystenta — ponowienie odświeża zapytania.
        <div
          role="alert"
          className="bg-danger-wash text-ink flex items-start gap-3 rounded-[var(--radius-control)] px-4 py-3 text-sm"
        >
          <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p>{pl.ai.intake.prerequisitesFailed}</p>
            <button
              type="button"
              onClick={state.retryPrerequisites}
              className="text-ink mt-1 text-sm font-medium underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 active:scale-[0.98]"
            >
              {pl.ai.retry}
            </button>
          </div>
        </div>
      ) : null}

      {state.error ? <AiErrorNote error={state.error} onRetry={state.run} /> : null}

      <Textarea
        autoFocus
        value={state.source}
        onChange={(event) => state.setSource(event.target.value)}
        placeholder={pl.ai.intake.placeholder}
        aria-label={pl.ai.intake.title}
        aria-invalid={state.tooLong || undefined}
        rows={12}
        className="min-h-[14rem] resize-y text-sm leading-relaxed"
      />

      {state.tooLong ? (
        <p role="alert" className="text-danger text-xs">
          {pl.ai.intake.tooLong(state.chars, MESSAGE_LIMIT)}
        </p>
      ) : showCounter ? (
        <p className={cn('tabular text-ink-faint text-xs')}>
          {pl.ai.intake.charCount(state.chars, MESSAGE_LIMIT)}
        </p>
      ) : null}

      {state.loaded && state.libraryEmpty ? (
        <p className="text-ink-soft text-xs">{pl.ai.intake.noLibrary}</p>
      ) : null}
    </div>
  );
}
