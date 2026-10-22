import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/data/queries/useWorkspace';
import type { Client } from '@/domain/client/schema';
import { AiBadge, AiMark, AiUsageHint } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { IntakeReview } from './IntakeReview';
import { IntakeSource } from './IntakeSource';
import { useCreateIntake } from './useCreateIntake';
import { useMessageIntake } from './useMessageIntake';

/**
 * Dialog „Teczka z wiadomości" (T-140, FEATURES-AI.md §8).
 *
 * Dwa kroki w jednym oknie: tekst → arkusz do przejrzenia. Stopka zmienia
 * się razem z krokiem, treść przewija się w środku, a nagłówek stoi — tak
 * samo jak arkusz z briefu. Montowany dopiero po kliknięciu (wzorzec
 * `CommentAiAction`), więc stan żyje i umiera razem z komponentem.
 *
 * `knownClient` (z karty klienta) wyłącza zgadywanie nadawcy: model dostaje
 * nazwę i miasto, dopasowania nie ma, a teczka powstaje u tego klienta.
 */
export function MessageIntakeDialog({
  knownClient = null,
  open,
  onOpenChange,
}: {
  knownClient?: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = useMessageIntake(knownClient);
  const creator = useCreateIntake();
  const currency = useWorkspace().data?.settings.currency ?? 'PLN';

  const review = state.step === 'review';
  const nameMissing =
    review &&
    !knownClient &&
    !(state.existingMatch && state.clientChoice === 'existing') &&
    !state.clientFields?.name.trim();
  const projectNameMissing = review && !state.projectFields?.name.trim();
  const canCreate =
    review && creator.ready && !creator.pending && !nameMissing && !projectNameMissing;

  const create = () => {
    const { effectiveProposal, masked, clientFields } = state;
    if (!effectiveProposal || !masked || !clientFields) return;
    const existingClient =
      knownClient ?? (state.clientChoice === 'existing' ? state.existingMatch : null);
    void creator.create({
      proposal: effectiveProposal,
      original: state.original,
      masked,
      existingClient,
      contact: { email: clientFields.email, phone: clientFields.phone },
      withQuote: state.withQuote,
      library: state.activeItems,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-hair border-b px-6 pt-6 pb-4">
          {review ? <AiBadge /> : null}
          <DialogTitle>{pl.ai.intake.title}</DialogTitle>
          <DialogDescription>{pl.ai.intake.intro}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {review ? (
            <IntakeReview state={state} currency={currency} />
          ) : (
            <IntakeSource state={state} />
          )}
        </div>

        <DialogFooter className="border-hair items-start gap-3 border-t px-6 py-4 sm:items-center sm:justify-between">
          <div className="min-w-0">
            {review ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={state.back}
                disabled={creator.pending}
                className="-ml-2"
              >
                <ArrowLeft className="size-4" aria-hidden />
                {pl.ai.intake.back}
              </Button>
            ) : (
              <AiUsageHint />
            )}
            {nameMissing || projectNameMissing ? (
              <p className="text-ink-soft mt-1 text-xs">{pl.ai.intake.nameRequired}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {pl.common.cancel}
            </Button>
            {review ? (
              <Button
                type="button"
                disabled={!canCreate}
                onClick={create}
                className="transition-transform duration-150 ease-out active:scale-[0.98]"
              >
                {creator.pending ? pl.ai.intake.creating : pl.ai.intake.create}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!state.canAnalyze}
                onClick={state.run}
                className="transition-transform duration-150 ease-out active:scale-[0.98]"
              >
                <AiMark size="xs" />
                {pl.ai.intake.analyze}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
