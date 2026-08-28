import { useCallback } from 'react';
import { toast } from 'sonner';
import { useCreateDocLibraryEntry, useDocLibrary } from '@/data/queries/useLibraryDocs';
import {
  PriceListEntryPayloadSchema,
  ScheduleEntryPayloadSchema,
  StagesEntryPayloadSchema,
  type DocLibraryKind,
} from '@/domain/library/doc-entries';

const PAYLOAD_OF = {
  schedule: ScheduleEntryPayloadSchema,
  stages: StagesEntryPayloadSchema,
  price_list: PriceListEntryPayloadSchema,
} as const;

/**
 * „Zapisz do biblioteki" z wiersza dokumentu (T-103) — odwrotność panelu.
 *
 * Schemat `omit` zdejmuje `id` (i dla terminu `kind`/`extras`): do biblioteki
 * idzie WZORZEC pozycji, nie jej egzemplarz. Wpis ląduje na końcu listy.
 */
export function useSaveDocToLibrary(kind: DocLibraryKind) {
  const create = useCreateDocLibraryEntry(kind);
  const library = useDocLibrary(kind);
  const count = library.data?.length ?? 0;

  return useCallback(
    (source: unknown) => {
      const parsed = PAYLOAD_OF[kind].safeParse(source);
      if (!parsed.success || !parsed.data.name.trim()) return;
      create.mutate(
        { payload: parsed.data, sortOrder: count },
        { onError: (error) => toast.error(error.message) },
      );
    },
    [kind, create, count],
  );
}
