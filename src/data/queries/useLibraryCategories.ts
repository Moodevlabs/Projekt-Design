import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLibraryCategory,
  deleteLibraryCategory,
  listLibraryCategoryRows,
  reorderLibraryCategories,
  updateLibraryCategory,
  type CategoryPatch,
  type CreateCategoryInput,
} from '@/data/repos/library-categories.repo';
import type { LibraryCategory } from '@/domain/library/schema';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Grupy biblioteczne (słownik).
 *
 * Osobny plik od `useLibrary`, tak jak repozytorium: `useLibraryGroups`
 * (zestawy) i `useLibraryCategoryList` (grupy) obok siebie w jednym module
 * byłyby zaproszeniem do pomyłki przy imporcie.
 */
export function useLibraryCategoryList() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryCategories(workspaceId),
    queryFn: () => listLibraryCategoryRows(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Słownik grup po `id` — do rozwiązywania `Group.categoryId` w edytorze (T-120).
 *
 * Mapa, nie `find()` w komponencie: bloki grup są zmemoizowane, a szukanie
 * po tablicy w każdym z nich zamieniałoby jedną zmianę nazwy w przebieg po
 * wszystkich grupach razy wszystkie kategorie. Referencja jest stabilna,
 * dopóki nie zmienią się dane.
 */
export function useLibraryCategoryMap(): ReadonlyMap<string, LibraryCategory> {
  const list = useLibraryCategoryList();
  const rows = list.data;

  return useMemo(() => new Map((rows ?? []).map((row) => [row.id, row])), [rows]);
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryCategories() });
    // Usługi noszą `categoryId` i pigułki filtrów liczą się z grup — obie
    // listy muszą się przestawić razem, inaczej filtr wskazuje na grupę,
    // której już nie ma.
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryItems() });
  };
}

export type CreateCategoryVars = Omit<CreateCategoryInput, 'workspaceId'>;

export function useCreateLibraryCategory() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateCategories();

  return useMutation({
    mutationFn: (vars: CreateCategoryVars) =>
      createLibraryCategory({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateLibraryCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryPatch }) =>
      updateLibraryCategory(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteLibraryCategory() {
  const invalidate = useInvalidateCategories();

  return useMutation({
    mutationFn: (id: string) => deleteLibraryCategory(id),
    onSuccess: invalidate,
  });
}

export function useReorderLibraryCategories() {
  const invalidate = useInvalidateCategories();

  return useMutation({
    mutationFn: (ids: string[]) => reorderLibraryCategories(ids),
    onSuccess: invalidate,
  });
}
