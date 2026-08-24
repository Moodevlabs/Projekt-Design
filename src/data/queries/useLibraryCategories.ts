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
