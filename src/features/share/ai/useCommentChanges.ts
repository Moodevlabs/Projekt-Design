import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAiCommentsToChanges } from '@/data/queries/useAi';
import { useAllLibraryItems } from '@/data/queries/useLibrary';
import { useLibraryCategoryMap } from '@/data/queries/useLibraryCategories';
import type { AiError } from '@/data/repos/ai.repo';
import type { LibraryItem } from '@/data/repos/library.repo';
import {
  applyCommentChanges,
  describeChange,
  libraryEntries,
  quoteView,
  type ApplyCommentChangesResult,
  type CommentChange,
  type CommentChangeDescription,
  type CommentChanges,
  type CommentChangeSkipReason,
} from '@/domain/ai';
import type { QuoteBody } from '@/domain/quote';

/**
 * Stan dialogu „uwagi → zmiany" (T-138).
 *
 * ## Co tu jest, a czego nie ma
 *
 * Hook buduje ładunek przez `quoteView` i `libraryEntries` (reguła A7: do
 * modelu idzie treść uwagi i struktura wyceny, bez autora), woła mutację
 * i trzyma zaznaczenia. **Nie** rozstrzyga, które zmiany są poprawne — to
 * robi `applyCommentChanges`, a dialog pokazuje odrzucone wyszarzone
 * z powodem.
 *
 * ## Podgląd liczy się z ZAZNACZONYCH zmian
 *
 * Zmiany nakładają się po kolei i zależą od siebie: `remove` pozycji
 * przechodzi tylko po jej `disable` w tej samej propozycji. Gdyby podgląd
 * liczył się ze wszystkich zmian, a zapis z zaznaczonych, odznaczenie
 * „Wyłącz X" zostawiłoby „Usuń X" zaznaczone i zielone w podglądzie, a przy
 * zapisie domena odrzuciłaby je po cichu. Dlatego `preview` jest wynikiem
 * `applyCommentChanges` dla zaznaczonego zbioru, liczonym po każdej zmianie
 * zaznaczeń — i ten sam wynik idzie do zapisu. Odrzucony wiersz zostaje
 * zaznaczony i zaznaczalny: po ponownym zaznaczeniu zależności sam wraca.
 *
 * Zaznaczenia trzymamy jako zbiór ODZNACZONYCH indeksów: domyślny stan
 * („wszystko z propozycji") wynika wtedy z danych, a nie z synchronizacji
 * stanu po odpowiedzi.
 */

export interface CommentChangeRow {
  index: number;
  change: CommentChange;
  description: CommentChangeDescription;
  /** Powód odrzucenia przez domenę przy bieżącym zaznaczeniu; `null` = nałożona albo odznaczona. */
  skipped: CommentChangeSkipReason | null;
  /** Zaznaczenie użytkownika — niezależne od tego, czy domena zmianę nałoży. */
  checked: boolean;
}

export type CommentChangesPhase = 'loading' | 'error' | 'ready';

export interface CommentChangesState {
  phase: CommentChangesPhase;
  result: CommentChanges | null;
  error: AiError | null;
  rows: CommentChangeRow[];
  /** Wynik nałożenia ZAZNACZONYCH zmian — ten sam, który idzie do zapisu. */
  preview: ApplyCommentChangesResult | null;
  /** Zmiany zaznaczone i faktycznie nałożone — w kolejności z propozycji. */
  selectedChanges: CommentChange[];
  library: LibraryItem[];
  toggle: (index: number) => void;
  retry: () => void;
}

export function useCommentChanges({
  body,
  currency,
  comment,
}: {
  body: QuoteBody;
  currency: string;
  comment: string;
}): CommentChangesState {
  const items = useAllLibraryItems();
  const categories = useLibraryCategoryMap();
  const library = items.data;
  const mutation = useAiCommentsToChanges();
  // `mutate` jest stabilne (TanStack); cała `mutation` zmienia się przy
  // każdym stanie i wciągnięta w zależności zapętliłaby efekt niżej.
  const { mutate } = mutation;
  const [deselected, setDeselected] = useState<ReadonlySet<number>>(() => new Set());
  const startedRef = useRef(false);

  const analyze = useCallback(() => {
    if (!library) return;
    setDeselected(new Set());
    mutate({
      comment,
      quote: quoteView(body, currency),
      library: libraryEntries(library, categories),
    });
  }, [library, categories, body, currency, comment, mutate]);

  // Analiza rusza sama po otwarciu — dialog montuje się dopiero po kliknięciu,
  // więc „otwórz" i „przeczytaj uwagę" to jeden gest, nie dwa.
  useEffect(() => {
    if (!library || startedRef.current) return;
    startedRef.current = true;
    analyze();
  }, [library, analyze]);

  const result = mutation.data?.data ?? null;

  const checkedChanges = useMemo(
    () => result?.changes.filter((_, index) => !deselected.has(index)) ?? [],
    [result, deselected],
  );

  const preview = useMemo(
    () => (result && library ? applyCommentChanges(body, checkedChanges, library) : null),
    [result, library, body, checkedChanges],
  );

  const rows = useMemo<CommentChangeRow[]>(() => {
    if (!result || !preview || !library) return [];
    // Zmiany trafiają do domeny jako te same obiekty, które przyszły z modelu,
    // więc powód odrzucenia da się odnaleźć po tożsamości.
    const skippedBy = new Map(preview.skipped.map((row) => [row.change, row.reason]));
    return result.changes.map((change, index) => ({
      index,
      change,
      description: describeChange(change, body, library),
      skipped: skippedBy.get(change) ?? null,
      checked: !deselected.has(index),
    }));
  }, [result, preview, library, body, deselected]);

  const toggle = useCallback((index: number) => {
    setDeselected((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const phase: CommentChangesPhase = mutation.isError
    ? 'error'
    : mutation.isSuccess && preview
      ? 'ready'
      : 'loading';

  return {
    phase,
    result,
    error: mutation.error,
    rows,
    preview,
    selectedChanges: preview?.applied ?? [],
    library: library ?? [],
    toggle,
    retry: analyze,
  };
}
