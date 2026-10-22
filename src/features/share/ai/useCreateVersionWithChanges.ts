import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { routes } from '@/app/routes';
import { useCreateQuoteVersion, useSaveQuote } from '@/data/queries/useQuotes';
import { duplicateQuoteBody, versionLabel, type QuoteBody } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Nowa wersja wyceny z nałożonymi zmianami (T-138).
 *
 * Idzie tą samą ścieżką co „Nowa wersja" w pasku edytora: `createQuoteVersion`
 * kopiuje dokument **z bazy** i nadaje nowe identyfikatory pozycjom, dlatego
 * zmian nie da się nałożyć na kopię — identyfikatory z propozycji modelu
 * dotyczą dokumentu otwartego w edytorze. Nakładamy je więc na bieżące
 * `body`, a wynik (z nowymi id, jak przy zwykłym duplikacie) zapisujemy
 * do świeżo założonej wersji. Poprzednia wersja zostaje nietknięta (A3).
 *
 * `applied` / `skipped` to liczniki z tego samego `applyCommentChanges`, który
 * dał `body`. Gdy coś z zaznaczonych odpadło, toast mówi to wprost — wersja
 * powstała, ale nie z całym zaznaczeniem, i udawanie pełnego sukcesu
 * zostawiłoby projektanta w błędzie co do treści nowej wersji.
 */
export function useCreateVersionWithChanges() {
  const newVersion = useCreateQuoteVersion();
  const save = useSaveQuote();
  const navigate = useNavigate();

  const create = useCallback(
    async ({
      quoteId,
      body,
      applied,
      skipped,
    }: {
      quoteId: string;
      body: QuoteBody;
      applied: number;
      skipped: number;
    }): Promise<boolean> => {
      let kopia;
      try {
        kopia = await newVersion.mutateAsync(quoteId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : pl.ai.comments.failed);
        return false;
      }

      try {
        await save.mutateAsync({
          id: kopia.id,
          body: duplicateQuoteBody(body),
          lastSeenUpdatedAt: kopia.updatedAt,
        });
        const created = pl.ai.comments.created(versionLabel(kopia.version));
        if (skipped > 0) {
          toast.warning(created, {
            description: pl.ai.comments.appliedWithSkips(applied, skipped),
          });
        } else {
          toast.success(created);
        }
      } catch {
        // Wersja już istnieje — zostawienie użytkownika na starej z samym
        // błędem ukryłoby ją. Przechodzimy i mówimy, co się nie udało.
        toast.error(pl.ai.comments.applyFailed);
      }
      void navigate(routes.quote(kopia.id));
      return true;
    },
    [newVersion, save, navigate],
  );

  return { create, pending: newVersion.isPending || save.isPending };
}
