import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import type { QuoteComment } from '@/domain/share/schema';
import { useEditorStore } from '@/features/quotes/editor/editor.store';
import { pl } from '@/i18n/pl';
import { CommentChangesDialog } from './CommentChangesDialog';

/**
 * Przycisk „Przełóż na zmiany (AI)" przy uwadze inwestora (T-138).
 *
 * Czyta dokument i status z magazynu edytora, a nie przez `useQuote`: karta
 * uwag stoi tylko w prawej kolumnie edytora, gdzie `body` jest już w pamięci
 * (razem z niezapisanymi zmianami — to na NICH ma powstać nowa wersja).
 * Dialog montuje się dopiero po kliknięciu: zamknięty pytałby o bibliotekę
 * i limit asystenta przy każdym wejściu do edytora.
 */
export function CommentAiAction({ comment }: { comment: QuoteComment }) {
  const [open, setOpen] = useState(false);
  const quote = useEditorStore(
    useShallow((state) => ({
      id: state.quoteId,
      body: state.body,
      status: state.status,
      version: state.version,
      currency: state.currency,
    })),
  );
  if (!quote.id || !quote.body) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-[12px]"
        onClick={() => setOpen(true)}
      >
        <Sparkles aria-hidden />
        {pl.ai.comments.action}
      </Button>
      {open ? (
        <CommentChangesDialog
          comment={comment}
          quote={{
            id: quote.id,
            body: quote.body,
            status: quote.status,
            version: quote.version,
            currency: quote.currency,
          }}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}
