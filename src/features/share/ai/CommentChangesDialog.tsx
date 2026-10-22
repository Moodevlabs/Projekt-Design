import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { canCreateVersion, versionLabel, type QuoteBody, type QuoteStatus } from '@/domain/quote';
import type { QuoteComment } from '@/domain/share/schema';
import { AiBadge, AiErrorNote, AiUsageHint, AiWorking } from '@/features/ai';
import { pl } from '@/i18n/pl';
import { ChangeList } from './ChangeList';
import { useCommentChanges, type CommentChangesState } from './useCommentChanges';
import { useCreateVersionWithChanges } from './useCreateVersionWithChanges';

export interface CommentChangesQuote {
  id: string;
  body: QuoteBody;
  status: QuoteStatus;
  version: number;
  currency: string;
}

/**
 * „Przełóż na zmiany (AI)" — uwaga inwestora jako propozycja nowej wersji (T-138).
 *
 * Trzy sekcje w kolejności czytania: czego klient chce (jedno zdanie), co
 * z tego da się zrobić w pozycjach (lista z checkboxami) i co zostaje do
 * rozmowy (fragmenty bez przełożenia na pozycje). Jedyna akcja zapisu to
 * nowa wersja — bieżącej wyceny dialog nie dotyka (A3): klient mógł ją już
 * dostać, a projektant ma mieć obie obok siebie w historii wersji.
 */
export function CommentChangesDialog({
  comment,
  quote,
  open,
  onOpenChange,
}: {
  comment: QuoteComment;
  quote: CommentChangesQuote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = useCommentChanges({
    body: quote.body,
    currency: quote.currency,
    comment: comment.message,
  });
  const creator = useCreateVersionWithChanges();
  const canVersion = canCreateVersion(quote.status);
  const nextLabel = versionLabel(quote.version + 1);
  const canCreate =
    canVersion && state.phase === 'ready' && state.selectedChanges.length > 0 && !creator.pending;

  // Zapis bierze DOKŁADNIE ten wynik, który stoi w podglądzie — bez ponownego
  // liczenia, które mogłoby się rozjechać z tym, co użytkownik zobaczył.
  // Zaznaczone, a odrzucone przez domenę zmiany (np. „usuń" bez „wyłącz")
  // nie blokują zapisu: dokument i tak jest taki jak w podglądzie, a projektant
  // dostaje o nich informację w toaście zamiast pozornego pełnego sukcesu.
  const createVersion = async () => {
    const preview = state.preview;
    if (!preview) return;
    const done = await creator.create({
      quoteId: quote.id,
      body: preview.body,
      applied: preview.applied.length,
      skipped: preview.skipped.length,
    });
    if (done) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {pl.ai.comments.title}
            <AiBadge />
          </DialogTitle>
          <DialogDescription>{pl.ai.comments.intro}</DialogDescription>
        </DialogHeader>

        <blockquote className="bg-surface-2 rounded-[var(--radius-control)] px-4 py-3">
          <p className="label-caps text-ink-soft">
            {pl.ai.comments.comment}
            {comment.authorName ? ` · ${comment.authorName}` : ''}
          </p>
          <p className="text-ink mt-1 text-sm leading-relaxed whitespace-pre-line">
            {comment.message}
          </p>
        </blockquote>

        {state.phase === 'loading' ? (
          <AiWorking label={pl.ai.comments.analyzing} hint={pl.ai.workingHint} showElapsed />
        ) : null}
        {state.phase === 'error' && state.error ? (
          <AiErrorNote error={state.error} onRetry={state.retry} />
        ) : null}
        {state.phase === 'ready' ? <Proposal state={state} /> : null}

        <DialogFooter className="items-start gap-3 sm:items-center sm:justify-between">
          <div className="min-w-0">
            <AiUsageHint />
            {!canVersion ? (
              <p className="text-ink-soft mt-1 text-xs">{pl.ai.comments.cannotVersion}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {pl.common.cancel}
            </Button>
            <Button disabled={!canCreate} onClick={() => void createVersion()}>
              {creator.pending ? pl.ai.comments.creating : pl.ai.comments.createVersion(nextLabel)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Proposal({ state }: { state: CommentChangesState }) {
  const result = state.result;
  if (!result) return null;
  // Licznik mówi, ile zmian NAPRAWDĘ trafi do nowej wersji — zaznaczone,
  // a odrzucone przez domenę, nie liczą się, choć stoją na liście.
  const checked = state.selectedChanges.length;

  return (
    <div className="space-y-5">
      {result.summary ? (
        <section>
          <p className="label-caps text-ink-soft">{pl.ai.comments.summary}</p>
          <p className="text-ink mt-1.5 text-sm leading-relaxed">{result.summary}</p>
        </section>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <p className="label-caps text-ink-soft">{pl.ai.comments.changes}</p>
          {state.rows.length > 0 ? (
            <span className="tabular text-ink-faint text-xs">
              {pl.ai.comments.selected(checked, state.rows.length)}
            </span>
          ) : null}
        </div>
        <div className="mt-2">
          {state.rows.length === 0 ? (
            <p className="text-ink-soft text-sm">{pl.ai.comments.noChanges}</p>
          ) : (
            <ChangeList rows={state.rows} onToggle={state.toggle} />
          )}
        </div>
      </section>

      {result.unresolved.length > 0 ? (
        <section>
          <p className="label-caps text-ink-soft">{pl.ai.comments.unresolved}</p>
          <ul className="marker:text-ink-faint mt-1.5 list-disc space-y-1 pl-4">
            {result.unresolved.map((fragment, index) => (
              <li key={index} className="text-ink text-sm leading-relaxed">
                {fragment}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
