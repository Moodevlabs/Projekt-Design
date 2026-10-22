import { AlertCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/data/queries/useWorkspace';
import type { Brief } from '@/domain/brief';
import { AiBadge, AiErrorNote, AiWorking } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { ProposalFooter } from './ProposalFooter';
import { ProposalItems } from './ProposalItems';
import { ProposalRooms } from './ProposalRooms';
import { useBriefProposal } from './useBriefProposal';
import { useCreateQuoteFromProposal } from './useCreateQuoteFromProposal';

/** Sentinel w selekcie szablonu — Radix nie przyjmuje pustego `value`. */
const NO_TEMPLATE = '__none__';

/**
 * Arkusz „Szkic wyceny z briefu" (T-137, FEATURES-AI.md §3).
 *
 * Trzy bloki do przejrzenia — pomieszczenia, zakres, opis — i dopiero pod
 * nimi przycisk, który cokolwiek zapisuje (reguła A3). Otwiera się z wiersza
 * wypełnionego briefu na karcie klienta i sam woła asystenta; w trakcie
 * pokazuje szkielet w kształcie tego, co ma przyjść, a nie spinner.
 *
 * Montowany tylko, gdy otwarty (`BriefRow`), więc `open` steruje jedynie
 * animacją Radixa — stan propozycji żyje i umiera razem z komponentem.
 */
export function BriefProposalSheet({
  brief,
  open,
  onOpenChange,
}: {
  brief: Brief;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = useBriefProposal(brief);
  const creator = useCreateQuoteFromProposal(brief.clientId);
  const currency = useWorkspace().data?.settings.currency ?? 'PLN';

  const { proposal } = state;
  const template = proposal?.templateId
    ? state.templates.find((row) => row.id === proposal.templateId)
    : undefined;

  const create = (projectId: string) => {
    if (!proposal) return;
    void creator.create({ proposal, library: state.activeItems, projectId });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-hair border-b px-6 pt-6 pb-4">
          <AiBadge />
          <SheetTitle>{pl.ai.brief.title}</SheetTitle>
          <SheetDescription>{pl.ai.brief.intro}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {state.libraryEmpty ? (
            <p className="text-ink-soft text-sm">{pl.ai.brief.noLibrary}</p>
          ) : state.prerequisiteError && !state.loaded ? (
            // Nie `AiErrorNote`: to błąd danych wstępnych (biblioteka,
            // szablony…), nie odpowiedzi asystenta — ponowienie odświeża
            // zapytania, a nie woła modelu.
            <div
              role="alert"
              className="bg-danger-wash text-ink flex items-start gap-3 rounded-[var(--radius-control)] px-4 py-3 text-sm"
            >
              <AlertCircle className="text-danger mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p>{pl.ai.brief.prerequisitesFailed}</p>
                <button
                  type="button"
                  onClick={state.retryPrerequisites}
                  className="text-ink mt-1 text-sm font-medium underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 active:scale-[0.98]"
                >
                  {pl.ai.retry}
                </button>
              </div>
            </div>
          ) : state.error ? (
            <AiErrorNote error={state.error} onRetry={state.retry} />
          ) : !proposal ? (
            <AiWorking label={pl.ai.brief.analyzing} rows={4} />
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="brief-proposal-title">{pl.ai.brief.titleField}</Label>
                <Input
                  id="brief-proposal-title"
                  value={proposal.title}
                  onChange={(event) => state.update({ title: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brief-proposal-template">{pl.ai.brief.templateLabel}</Label>
                <Select
                  value={proposal.templateId ?? NO_TEMPLATE}
                  onValueChange={(value) =>
                    state.update({ templateId: value === NO_TEMPLATE ? null : value })
                  }
                >
                  <SelectTrigger id="brief-proposal-template" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEMPLATE}>{pl.ai.brief.noTemplate}</SelectItem>
                    {state.templates.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-ink-soft text-xs">
                  {template ? pl.ai.brief.template(template.name) : pl.ai.brief.noTemplate}
                </p>
              </div>

              <ProposalRooms
                rooms={proposal.rooms}
                onChange={state.updateRoom}
                onRemove={state.removeRoom}
                onAdd={state.addRoom}
              />

              <ProposalItems
                items={proposal.items}
                libraryById={state.libraryById}
                categories={state.categories}
                currency={currency}
                onToggle={state.setItemEnabled}
              />

              <div className="space-y-2">
                <Label htmlFor="brief-proposal-description">{pl.ai.brief.description}</Label>
                <Textarea
                  id="brief-proposal-description"
                  value={proposal.projectDescription}
                  onChange={(event) => state.update({ projectDescription: event.target.value })}
                  rows={4}
                />
              </div>

              {proposal.openQuestions.length > 0 ? (
                <section>
                  <h3 className="label-caps text-ink-soft">{pl.ai.brief.openQuestions}</h3>
                  <ul className="text-ink-soft mt-2 list-disc space-y-1 pl-5 text-sm">
                    {proposal.openQuestions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <SheetFooter className="border-hair border-t px-6 py-4">
          <ProposalFooter
            clientId={brief.clientId}
            proposalTitle={proposal?.title ?? ''}
            disabled={!proposal || !creator.ready}
            pending={creator.pending}
            onCreate={create}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
