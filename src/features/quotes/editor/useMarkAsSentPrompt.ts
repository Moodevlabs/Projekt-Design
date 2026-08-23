import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from './editor.store';
import { useSetQuoteStatus } from '@/data/queries/useQuotes';
import { pl } from '@/i18n/pl';

/**
 * Pytanie „Oznaczyć jako wysłaną?" po eksporcie PDF (04-PDF §5).
 *
 * Trzy rzeczy, które nie są oczywiste:
 *
 *  - **Pytamy tylko o szkic.** Wycena zaakceptowana albo odrzucona jest już
 *    dalej w swoim życiu; cofanie jej do „wysłanej" byłoby zniszczeniem
 *    informacji, i to bez pytania o zgodę na to konkretnie.
 *  - **Pytamy raz na sesję edytora.** Ktoś, kto eksportuje trzy razy pod rząd,
 *    bo poprawia literówkę, nie ma dostawać tego samego pytania trzy razy.
 *  - **Odmowa nie jest błędem** i nie wraca przy kolejnym eksporcie tej samej
 *    wyceny. „Nie" znaczy „nie", a nie „zapytaj później".
 */
export function useMarkAsSentPrompt() {
  const setStatus = useSetQuoteStatus();
  const [open, setOpen] = useState(false);
  /** Czy w tej sesji edytora pytanie już padło (niezależnie od odpowiedzi). */
  const [asked, setAsked] = useState(false);

  /** Wołane po UDANYM zapisie pliku — nie po samym kliknięciu „Eksportuj". */
  const afterExport = useCallback(() => {
    if (asked) return;
    if (useEditorStore.getState().status !== 'draft') return;

    setAsked(true);
    setOpen(true);
  }, [asked]);

  const confirm = useCallback(() => {
    const { quoteId } = useEditorStore.getState();
    setOpen(false);
    if (!quoteId) return;

    setStatus.mutate(
      { id: quoteId, status: 'sent' },
      {
        onSuccess: () => {
          // Store trzyma status niezależnie od cache zapytań — bez tego pasek
          // edytora pokazywałby dalej „szkic" aż do przeładowania strony.
          useEditorStore.getState().setStatus('sent');
          toast.success(pl.editor.markedAsSent);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }, [setStatus]);

  return { open, setOpen, afterExport, confirm };
}
