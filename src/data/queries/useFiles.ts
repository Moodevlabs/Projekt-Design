import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteFile,
  getStorageUsage,
  listFiles,
  renameFile,
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

export function useDeleteFile() {
  const invalidate = useInvalidateFiles();

  return useMutation({
    mutationFn: (file: Pick<StoredFile, 'id' | 'storagePath'>) => deleteFile(file),
    onSuccess: invalidate,
  });
}
