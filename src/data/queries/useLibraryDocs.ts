import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDocLibraryEntry,
  deleteDocLibraryEntry,
  listDocLibrary,
  reorderDocLibrary,
  seedDocLibrary,
  updateDocLibraryEntry,
  type DocLibraryRow,
} from '@/data/repos/library-docs.repo';
import {
  builtInDocLibrary,
  type DocLibraryEntry,
  type DocLibraryKind,
  type DocLibraryPayloadByKind,
} from '@/domain/library/doc-entries';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Biblioteka dokumentów (T-102) — hooki per rodzaj.
 *
 * **Seed dzieje się w `queryFn`, nie w efekcie komponentu.** Pusta lista przy
 * pierwszym otwarciu sekcji oznacza „nigdy nie seedowano" — wtedy wołamy RPC
 * z wbudowanym szablonem i czytamy jeszcze raz. RPC sam pilnuje idempotencji
 * (także wobec wpisów skasowanych), więc drugie urządzenie w tej samej
 * sekundzie dostanie `0` i tę samą listę.
 */
async function listWithSeed<K extends DocLibraryKind>(
  workspaceId: string,
  kind: K,
): Promise<DocLibraryRow<K>[]> {
  const rows = await listDocLibrary(workspaceId, kind);
  if (rows.length > 0) return rows;

  const inserted = await seedDocLibrary(workspaceId, kind, builtInDocLibrary(kind));
  return inserted > 0 ? listDocLibrary(workspaceId, kind) : rows;
}

export function useDocLibrary<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryDocs(kind, workspaceId),
    queryFn: () => listWithSeed(requireWorkspaceId(workspaceId), kind),
    enabled: Boolean(workspaceId),
  });
}

/** Tylko wpisy, które dało się odczytać — do pickera w edytorze. */
export function useDocLibraryEntries<K extends DocLibraryKind>(kind: K) {
  const query = useDocLibrary(kind);
  const entries = (query.data ?? [])
    .map((row) => row.entry)
    .filter((entry): entry is DocLibraryEntry<K> => entry !== null);
  return { ...query, entries };
}

function useInvalidateDocs(kind: DocLibraryKind) {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.libraryDocs(kind) });
}

export function useCreateDocLibraryEntry<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateDocs(kind);

  return useMutation({
    mutationFn: (vars: { payload: DocLibraryPayloadByKind[K]; sortOrder?: number }) =>
      createDocLibraryEntry({
        workspaceId: requireWorkspaceId(workspaceId),
        kind,
        payload: vars.payload,
        sortOrder: vars.sortOrder,
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateDocLibraryEntry<K extends DocLibraryKind>(kind: K) {
  const invalidate = useInvalidateDocs(kind);

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DocLibraryPayloadByKind[K] }) =>
      updateDocLibraryEntry(kind, id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDocLibraryEntry(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocs(kind);

  return useMutation({
    mutationFn: (id: string) => deleteDocLibraryEntry(id),
    onSuccess: invalidate,
  });
}

export function useReorderDocLibrary(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocs(kind);

  return useMutation({
    mutationFn: (ids: string[]) => reorderDocLibrary(ids),
    onSuccess: invalidate,
  });
}
