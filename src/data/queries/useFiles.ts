import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteFilePermanently,
  getStorageUsage,
  listFiles,
  listTrash,
  purgeExpiredTrash,
  renameFile,
  restoreFile,
  trashFile,
  uploadFile,
  type FileFilters,
  type UploadFileInput,
} from '@/data/repos/files.repo';
import { queryKeys } from '@/data/query-keys';
import type { StoredFile } from '@/domain/files/schema';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

export type FileListFilters = Omit<FileFilters, 'workspaceId'>;

export function useFiles(filters: FileListFilters = {}) {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.files({ workspaceId, ...filters }),
    queryFn: () => listFiles({ ...filters, workspaceId: requireWorkspaceId(workspaceId) }),
    enabled: Boolean(workspaceId),
  });
}

/** Pasek zużycia w Ustawieniach → Pliki. */
export function useStorageUsage() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.storageUsage(workspaceId),
    queryFn: () => getStorageUsage(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

function useInvalidateFiles() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.files() });
    // Każdy upload i każde usunięcie zmienia licznik miejsca — pasek zużycia
    // ma się przestawić bez przeładowania Ustawień.
    void queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage() });
  };
}

export type UploadFileVars = Omit<UploadFileInput, 'workspaceId'>;

export function useUploadFile() {
  const workspaceId = useWorkspaceId();
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: (vars: UploadFileVars) =>
      uploadFile({ ...vars, workspaceId: requireWorkspaceId(workspaceId) }),
    onSuccess: invalidate,
  });
}

export function useRenameFile() {
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameFile(id, name),
    onSuccess: invalidate,
  });
}

/**
 * „Usuń" z listy plików = **przeniesienie do kosza** (T-67).
 *
 * Nazwa hooka zostaje `useDeleteFile`, bo z punktu widzenia interfejsu to
 * wciąż jest usuwanie — zmieniło się tylko to, że da się je cofnąć.
 */
export function useDeleteFile() {
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: (file: Pick<StoredFile, 'id' | 'storagePath'>) => trashFile(file.id),
    onSuccess: invalidate,
  });
}

export function useTrash() {
  const workspaceId = useWorkspaceId();

  return useQuery({
    queryKey: queryKeys.trash(workspaceId),
    queryFn: () => listTrash(requireWorkspaceId(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

export function useRestoreFile() {
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: (id: string) => restoreFile(id),
    onSuccess: invalidate,
  });
}

export function useDeleteFilePermanently() {
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: (file: Pick<StoredFile, 'id' | 'storagePath'>) => deleteFilePermanently(file),
    onSuccess: invalidate,
  });
}

/**
 * Sprzątanie kosza po 30 dniach — wołane raz przy wejściu do widoku plików.
 *
 * `staleTime: Infinity` i `retry: false`, bo to nie jest odczyt danych do
 * pokazania: to operacja porządkowa, której nie ma sensu ponawiać ani
 * odświeżać. Zwraca liczbę usuniętych plików.
 */
export function usePurgeExpiredTrash() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['trash-purge', workspaceId] as const,
    queryFn: async () => {
      const removed = await purgeExpiredTrash(requireWorkspaceId(workspaceId));
      if (removed > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.files() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.trash() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage() });
      }
      return removed;
    },
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    retry: false,
  });
}
