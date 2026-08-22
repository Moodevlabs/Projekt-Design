import { useCallback, useState } from 'react';
import type { LibraryItem } from '@/data/repos/library.repo';
import { useLibraryCascade } from '@/features/quotes/editor/useLibraryCascade';
import { cascadeFields, hasCascadeFields, type CascadeFields } from './item-draft';

export interface CascadePrompt {
  itemId: string;
  itemName: string;
  /** Ile pozycji OTWARTEJ wyceny zostanie zaktualizowanych. */
  count: number;
  patch: CascadeFields;
}

export interface CascadePromptApi {
  prompt: CascadePrompt | null;
  /** Wywoływane po udanym zapisie w bibliotece. Samo decyduje, czy pytać. */
  offer: (previous: LibraryItem, next: LibraryItem) => void;
  accept: () => void;
  dismiss: () => void;
}

/**
 * Kaskada zmian z biblioteki do otwartej wyceny (T-10).
 *
 * Kolejność jest celowa: **najpierw zapis w bibliotece, potem pytanie**. Odmowa
 * zostawia zmianę w bibliotece i nie dotyka wyceny — biblioteka i dokument to
 * dwa niezależne byty, a wycena wysłana klientowi nie może się zmieniać sama.
 *
 * Pytamy tylko wtedy, gdy jest o co pytać: zmieniło się któreś z trzech
 * kaskadujących pól **i** w otwartej wycenie są pozycje z tego wpisu.
 */
export function useCascadePrompt(): CascadePromptApi {
  const cascade = useLibraryCascade();
  const [prompt, setPrompt] = useState<CascadePrompt | null>(null);

  const offer = useCallback(
    (previous: LibraryItem, next: LibraryItem) => {
      const patch = cascadeFields(previous, next);
      if (!hasCascadeFields(patch)) return;

      const count = cascade.linkedCount(next.id);
      if (count === 0) return;

      setPrompt({ itemId: next.id, itemName: next.name, count, patch });
    },
    [cascade],
  );

  // Efekt poza aktualizatorem stanu — w StrictMode aktualizator woła się dwa razy.
  const accept = useCallback(() => {
    if (!prompt) return;
    cascade.apply(prompt.itemId, prompt.patch);
    setPrompt(null);
  }, [cascade, prompt]);

  const dismiss = useCallback(() => setPrompt(null), []);

  return { prompt, offer, accept, dismiss };
}
