import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLibraryGroup,
  createLibraryItem,
  deleteLibraryGroup,
  countSampleItems,
  deleteLibraryItem,
  deleteSampleLibrary,
  fetchLibraryUsage,
  listLibraryCategories,
  listLibraryGroups,
  listLibraryItems,
  saveItemsToLibrary,
  updateLibraryGroup,
  updateLibraryItem,
  type CreateLibraryGroupInput,
  type CreateLibraryItemInput,
  type LibraryGroupPatch,
  type LibraryItemFilters,
  type LibraryItemPatch,
  type SaveToLibraryInput,
} from '@/data/repos/library.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

export function useLibraryItems(filters: LibraryItemFilters = {}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryItems({ workspaceId, ...filters }),
    queryFn: () => listLibraryItems(requireWorkspaceId(workspaceId), filters),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Cala biblioteka, bez filtrow ekranu.
 *
 * Osobna nazwa, a nie drugie `useLibraryItems()` w komponencie: to samo
 * wywolanie z roznymi argumentami dwa razy w jednym pliku czyta sie jak
 * pomylka, a chodzi tu o cos innego — o zbior, ktory NIE ma zalezec od tego,
 * co uzytkownik wpisal w szukajke (grupy wariantow, podpowiedzi).
 */
export function useAllLibraryItems() {
  return useLibraryItems();
}

export function useLibraryCategories() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryCategories(workspaceId),
    queryFn: () => listLibraryCategories(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

/**
 * Każda zmiana pozycji może dołożyć albo osierocić kategorię, więc listę
 * kategorii unieważniamy razem z listą pozycji.
 */
function useInvalidateItems() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryItems() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.libraryCategories() });
  };
}

export type CreateLibraryItemVars = Omit<CreateLibraryItemInput, 'workspaceId'>;

export function useCreateLibraryItem() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: (vars: CreateLibraryItemVars) =>
      createLibraryItem({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useUpdateLibraryItem() {
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LibraryItemPatch }) =>
      updateLibraryItem(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteLibraryItem() {
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: (id: string) => deleteLibraryItem(id),
    onSuccess: invalidate,
  });
}

/** „Zapisz wszystko z tej wyceny do biblioteki" (T-10). */
export function useSaveItemsToLibrary() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateItems();

  return useMutation({
    mutationFn: (items: SaveToLibraryInput[]) =>
      saveItemsToLibrary(requireWorkspaceId(workspaceId), items),
    onSuccess: invalidate,
  });
}

export function useLibraryGroups() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryGroups(workspaceId),
    queryFn: () => listLibraryGroups(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

export type CreateLibraryGroupVars = Omit<CreateLibraryGroupInput, 'workspaceId'>;

export function useCreateLibraryGroup() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (vars: CreateLibraryGroupVars) =>
      createLibraryGroup({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryGroups() });
    },
  });
}

export function useUpdateLibraryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LibraryGroupPatch }) =>
      updateLibraryGroup(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryGroups() });
    },
  });
}

export function useDeleteLibraryGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLibraryGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryGroups() });
    },
  });
}

/**
 * Statystyki uzycia uslug (T-61).
 *
 * `staleTime` 5 minut: liczba jest orientacyjna i nie musi byc swieza co do
 * sekundy, a RPC przechodzi po `body` wszystkich wycen — nie ma powodu robic
 * tego przy kazdym wejsciu na karte.
 */
export function useLibraryUsage() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.libraryUsage(workspaceId),
    queryFn: () => fetchLibraryUsage(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

/** Ile wpisow przykladowych zostalo — do etykiety „Usun pozostale (N)" (T-62). */
export function useSampleCount() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.librarySample(workspaceId),
    queryFn: () => countSampleItems(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

export function useDeleteSampleLibrary() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteSampleLibrary(requireWorkspaceId(workspaceId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryItems() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.libraryCategories() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.librarySample() });
    },
  });
}
