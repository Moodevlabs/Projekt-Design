import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatMinutes } from '@/domain/time';
import { calcWorkload, type QuoteBody } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Szacunek pracochłonności (F2.3).
 *
 * **Na żądanie, pod ikoną zegara** — a nie jako kolejny wiersz podsumowania.
 * W trybie kwotowym to jest szacunek wyliczony wstecz z ceny, a nie liczba,
 * którą ktoś wpisał; postawiona obok sum wyglądałaby na równie pewną co one.
 * Kliknięcie w zegar jest świadomym pytaniem „ile to właściwie roboty?".
 *
 * W trybie godzinowym minuty są w dokumencie wprost i stoją w `TotalsCard`;
 * tutaj dochodzi tylko rozbicie na sekcje i komunikację projektową.
 */
export function WorkloadPopover({
  body,
  fallbackRateCents,
}: {
  body: QuoteBody;
  /** Stawka z ustawień workspace'u — w trybie kwotowym dokument jej nie ma. */
  fallbackRateCents: number | null;
}) {
  const workload = calcWorkload(body, fallbackRateCents);

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={pl.editor.workloadEstimate}
        title={pl.editor.workloadEstimate}
        className="text-ink-soft hover:text-ink focus-visible:ring-ring inline-flex size-6 items-center justify-center rounded-[var(--radius-control)] focus-visible:ring-2 focus-visible:outline-none"
      >
        <Clock className="size-4" aria-hidden />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[280px] space-y-3">
        <p className="text-ink text-sm font-semibold">{pl.editor.workloadEstimate}</p>

        {!workload.available ? (
          // Bez stawki nie ma z czego liczyć. Mówimy, czego brakuje, zamiast
          // pokazywać zera, które wyglądałyby jak wynik.
          <p className="text-ink-soft text-xs">{pl.editor.workloadNoRate}</p>
        ) : (
          <>
            {body.pricingBasis === 'amount' ? (
              // Szacunek wstecz z ceny — to nie to samo co czas wpisany ręcznie.
              <p className="text-ink-soft text-xs">{pl.editor.workloadEstimateHint}</p>
            ) : null}

            <ul className="space-y-1.5">
              {workload.minutesBySection.map((section) => (
                <li key={section.sectionId} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-soft min-w-0 truncate text-xs">{section.title}</span>
                  <span className="tabular text-ink shrink-0 text-xs">
                    {formatMinutes(section.minutes)}
                  </span>
                </li>
              ))}
            </ul>

            {workload.communicationMinutes > 0 ? (
              <div className="border-hair border-t pt-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-soft text-xs">{pl.editor.workloadCommunication}</span>
                  <span className="tabular text-ink shrink-0 text-xs">
                    {formatMinutes(workload.communicationMinutes)}
                  </span>
                </div>
                {/* „W tym", a nie „plus" — te minuty są już w sumie wyżej. */}
                <p className="text-ink-soft mt-1 text-[11px]">
                  {pl.editor.workloadCommunicationHint}
                </p>
              </div>
            ) : null}

            <div className="border-hair flex items-baseline justify-between gap-3 border-t pt-2">
              <span className="text-ink text-xs font-semibold">{pl.editor.workloadTotal}</span>
              <span className="tabular text-ink shrink-0 text-sm font-semibold">
                {formatMinutes(workload.minutesTotal)}
              </span>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
