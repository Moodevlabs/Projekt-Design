import { Checkbox } from '@/components/ui/checkbox';
import { ProposalItems } from '@/features/brief/ai/ProposalItems';
import { ProposalRooms } from '@/features/brief/ai/ProposalRooms';
import { pl } from '@/i18n/pl';
import { IntakeClientBlock } from './IntakeClientBlock';
import { IntakeProjectBlock } from './IntakeProjectBlock';
import type { MessageIntakeState } from './useMessageIntake';

/**
 * Krok 2 — arkusz do przejrzenia (reguła A3: nic nie zapisuje się bez
 * „Utwórz teczkę").
 *
 * Kolejność bloków to kolejność czytania maila: o czym jest (summary),
 * kto pisze (klient), o jaki obiekt chodzi (teczka), co ma być zrobione
 * (pomieszczenia, zakres), czego brakuje (pytania). Wycena jest na końcu
 * jako decyzja, nie jako kolejny blok danych.
 */
export function IntakeReview({ state, currency }: { state: MessageIntakeState; currency: string }) {
  const { proposal, masked } = state;
  if (!proposal || !masked) return null;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="label-caps text-ink-soft">{pl.ai.intake.summary}</h3>
        <p className="text-ink mt-1.5 text-sm leading-relaxed">
          {proposal.summary || proposal.title}
        </p>
        <p className="text-ink-faint mt-2 text-xs">
          {pl.ai.intake.masked(masked.emails.length, masked.phones.length)}
        </p>
      </section>

      <IntakeClientBlock state={state} />
      <IntakeProjectBlock state={state} />

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

      {proposal.openQuestions.length > 0 ? (
        <section>
          <h3 className="label-caps text-ink-soft">{pl.ai.intake.openQuestions}</h3>
          <ul className="marker:text-ink-faint text-ink-soft mt-2 list-disc space-y-1 pl-5 text-sm">
            {proposal.openQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-hair border-t pt-5">
        <div className="flex items-start gap-3">
          <Checkbox
            id="intake-with-quote"
            checked={state.withQuote}
            disabled={!state.hasScope}
            onCheckedChange={(checked) => state.setWithQuote(checked === true)}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <label
              htmlFor="intake-with-quote"
              className={
                state.hasScope
                  ? 'text-ink cursor-pointer text-sm font-medium'
                  : 'text-ink-soft text-sm font-medium'
              }
            >
              {pl.ai.intake.withQuote}
            </label>
            {!state.hasScope ? (
              <p className="text-ink-soft mt-1 text-xs leading-relaxed">{pl.ai.intake.noScope}</p>
            ) : null}
          </div>
        </div>
        <p className="text-ink-faint mt-4 text-xs">{pl.ai.intake.sourceNote}</p>
      </section>
    </div>
  );
}
