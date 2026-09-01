import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDocCategory,
  createDocSet,
  deleteDocCategory,
  deleteDocSet,
  listDocCategories,
  listDocSets,
  reorderDocCategories,
  setDocEntryCategory,
  updateDocCategory,
  updateDocSet,
  type DocCategoryPatch,
  type DocSetPatch,
} from '@/data/repos/library-doc-groups.repo';
import type { DocLibraryCategory } from '@/domain/library/doc-groups';
import type { DocLibraryKind, DocLibraryPayloadByKind } from '@/domain/library/doc-entries';
import type { LibraryColor } from '@/domain/library/schema';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Grupy i zestawy bibliotek dokumentów (T-121) — hooki per rodzaj.
 *
 * Osobny plik od `useLibraryDocs` (wpisy), tak jak `useLibraryCategories`
 * stoi obok `useLibrary`: `useDocLibrary` i `useDocCategories` w jednym
 * module byłyby zaproszeniem do pomyłki przy imporcie.
 */

// =============================================================================
// Grupy
// =============================================================================

export function useDocCategories<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryDocCategories(kind, workspaceId),
    queryFn: () => listDocCategories(requireWorkspaceId(workspaceId), kind),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Słownik grup po `id` — do rozwiązywania `categoryId` wpisu bez `find()`
 * w każdym wierszu. Referencja stabilna, dopóki nie zmienią się dane.
 */
export function useDocCategoryMap<K extends DocLibraryKind>(
  kind: K,
): ReadonlyMap<string, DocLibraryCategory> {
  const list = useDocCategories(kind);
  const rows = list.data;

  return useMemo(() => new Map((rows ?? []).map((row) => [row.id, row])), [rows]);
}

/**
 * Zmiana w grupach rusza też listę wpisów: usunięcie grupy odpina wpisy,
 * a przypisanie zmienia ich `category_id`. Obie listy muszą przestawić się
 * razem, inaczej filtr wskazuje na grupę, której już nie ma.
 */
function useInvalidateDocGroups(kind: DocLibraryKind) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryDocCategories(kind) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryDocs(kind) });
  };
}

export function useCreateDocCategory<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateDocGroups(kind);

  return useMutation({
    mutationFn: (vars: {
      name: string;
      code?: string;
      color?: LibraryColor | null;
      sortOrder?: number;
    }) => createDocCategory({ ...vars, kind, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateDocCategory<K extends DocLibraryKind>(kind: K) {
  const invalidate = useInvalidateDocGroups(kind);

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocCategoryPatch }) =>
      updateDocCategory(kind, id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteDocCategory(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocGroups(kind);

  return useMutation({
    mutationFn: (id: string) => deleteDocCategory(id),
    onSuccess: invalidate,
  });
}

export function useReorderDocCategories(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocGroups(kind);

  return useMutation({
    mutationFn: (ids: string[]) => reorderDocCategories(ids),
    onSuccess: invalidate,
  });
}

/** Przypisanie wpisu do grupy albo odpięcie (`null`). */
export function useSetDocEntryCategory(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocGroups(kind);

  return useMutation({
    mutationFn: ({ entryId, categoryId }: { entryId: string; categoryId: string | null }) =>
      setDocEntryCategory(entryId, categoryId),
    onSuccess: invalidate,
  });
}

// =============================================================================
// Zestawy
// =============================================================================

export function useDocSets<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryDocSets(kind, workspaceId),
    queryFn: () => listDocSets(requireWorkspaceId(workspaceId), kind),
    enabled: Boolean(workspaceId),
  });
}

function useInvalidateDocSets(kind: DocLibraryKind) {
  const queryClient = useQueryClient();
  // Zestaw to snapshot — nie rusza wpisów, więc unieważniamy tylko zestawy.
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.libraryDocSets(kind) });
}

export function useCreateDocSet<K extends DocLibraryKind>(kind: K) {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateDocSets(kind);

  return useMutation({
    mutationFn: (vars: {
      name: string;
      items?: DocLibraryPayloadByKind[K][];
      sortOrder?: number;
    }) => createDocSet({ ...vars, kind, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateDocSet<K extends DocLibraryKind>(kind: K) {
  const invalidate = useInvalidateDocSets(kind);

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocSetPatch<K> }) =>
      updateDocSet(kind, id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteDocSet(kind: DocLibraryKind) {
  const invalidate = useInvalidateDocSets(kind);

  return useMutation({
    mutationFn: (id: string) => deleteDocSet(id),
    onSuccess: invalidate,
  });
}
