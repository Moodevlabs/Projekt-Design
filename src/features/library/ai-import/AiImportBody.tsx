import { useEffect } from 'react';
import { FileSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AiBadge } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { ProposalTable } from './ProposalTable';
import { SourceStep } from './SourceStep';
import { useAiImport } from './useAiImport';

export interface AiImportStatus {
  /** Tabela propozycji potrzebuje szerszego okna niż strefa upuszczania. */
  wide: boolean;
  /** Trwa zapis — powłoka nie pozwala zamknąć dialogu. */
  locked: boolean;
}

/**
 * Treść dialogu importu: trzy kroki — źródło → tabela propozycji → zapis
 * z paskiem postępu. Montowane tylko przy otwartym dialogu (patrz powłoka).
 */
export function AiImportBody({
  open,
  onStatus,
  onClose,
}: {
  open: boolean;
  onStatus: (status: AiImportStatus) => void;
  onClose: () => void;
}) {
  const state = useAiImport();
  const saving = state.step === 'saving';
  const wide = state.step !== 'source';

  useEffect(() => {
    onStatus({ wide, locked: saving });
  }, [wide, saving, onStatus]);

  const save = async () => {
    const ok = await state.save();
    if (ok) onClose();
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between gap-3 pr-6">
          <DialogTitle>{pl.ai.import.title}</DialogTitle>
          {state.step !== 'source' ? <AiBadge /> : null}
        </div>
        <DialogDescription>
          {state.step === 'source'
            ? pl.ai.import.intro
            : state.rows.length > 0
              ? pl.ai.import.found(state.rows.length)
              : pl.ai.import.empty}
        </DialogDescription>
      </DialogHeader>

      {state.step === 'source' ? (
        <SourceStep
          active={open}
          analyzing={state.analyzing}
          error={state.analysisError}
          onSubmit={state.submitSource}
          onRetry={state.retry}
        />
      ) : null}

      {state.step === 'proposal' && state.rows.length === 0 ? (
        <EmptyProposal warnings={state.proposal?.warnings ?? []} />
      ) : null}

      {state.step === 'proposal' && state.rows.length > 0 ? (
        <ProposalTable
          rows={state.rows}
          categories={state.categories}
          warnings={state.proposal?.warnings ?? []}
          onToggle={state.toggleRow}
          onToggleAll={state.toggleAll}
          onChange={state.updateRow}
        />
      ) : null}

      {saving && state.progress ? (
        <div className="space-y-2 py-2" aria-live="polite">
          <p className="text-ink-soft tabular text-sm">
            {pl.ai.import.saving(state.progress.done, state.progress.total)}
          </p>
          <Progress
            value={
              state.progress.total === 0
                ? 100
                : Math.round((state.progress.done / state.progress.total) * 100)
            }
          />
        </div>
      ) : null}

      {state.saveError ? (
        <p
          role="alert"
          className="bg-danger-wash text-ink rounded-[var(--radius-control)] px-4 py-3 text-sm"
        >
          {pl.ai.import.failed} {state.saveError}
        </p>
      ) : null}

      {state.step === 'proposal' ? (
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={state.back}>
            {pl.ai.import.back}
          </Button>
          {state.rows.length > 0 ? (
            <Button
              type="button"
              onClick={() => void save()}
              disabled={state.selectedCount === 0}
              className="transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              {pl.ai.import.save(state.selectedCount)}
            </Button>
          ) : null}
        </DialogFooter>
      ) : null}
    </>
  );
}

/** Propozycja bez pozycji: model nic nie odczytał — pokazujemy, co zgłosił, i drogę wstecz. */
function EmptyProposal({ warnings }: { warnings: readonly string[] }) {
  return (
    <div className="text-ink-soft flex flex-col items-center gap-2 py-6 text-center text-sm">
      <FileSearch className="text-ink-faint size-8" aria-hidden />
      <p>{pl.ai.import.empty}</p>
      {warnings.length > 0 ? (
        <ul className="text-ink-faint mt-2 space-y-0.5 text-xs">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
