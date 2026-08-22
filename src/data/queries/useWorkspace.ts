import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentWorkspace,
  renameWorkspace,
  updateWorkspaceSettings,
  type Workspace,
} from '@/data/repos/workspace.repo';
import { RepoError } from '@/data/repos/errors';
import { queryKeys } from '@/data/query-keys';
import type { WorkspaceSettings } from '@/domain/brand/schema';

/** Workspace zmienia się raz na ruski rok — trzymamy go świeżym przez 5 minut. */
const WORKSPACE_STALE_MS = 5 * 60_000;

/**
 * Podstawa dla pozostałych hooków: wszystkie repozytoria potrzebują
 * `workspaceId`, a mamy go dopiero po pierwszym zapytaniu.
 */
export function useWorkspace() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: getCurrentWorkspace,
    staleTime: WORKSPACE_STALE_MS,
  });
}

/** `undefined`, dopóki workspace się nie wczyta — hooki niżej czekają na niego przez `enabled`. */
export function useWorkspaceId(): string | undefined {
  return useWorkspace().data?.id;
}

/**
 * Strażnik dla `queryFn`/`mutationFn`. Zapytania i tak są wyłączone przez
 * `enabled`, ale TypeScript o tym nie wie — a rzucony błąd jest lepszy niż
 * `workspaceId!` przemycone do zapytania.
 */
export function requireWorkspaceId(workspaceId: string | undefined): string {
  if (!workspaceId) throw new RepoError('Workspace nie jest jeszcze wczytany.');
  return workspaceId;
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (settings: WorkspaceSettings) =>
      updateWorkspaceSettings(requireWorkspaceId(workspaceId), settings),
    onSuccess: (settings) => {
      queryClient.setQueryData<Workspace>(queryKeys.workspace, (prev) =>
        prev ? { ...prev, settings } : prev,
      );
      // Ustawienia (VAT, waluta) wchodzą do nowych wycen — lista musi je zobaczyć.
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
    },
  });
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (name: string) => renameWorkspace(requireWorkspaceId(workspaceId), name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workspace });
    },
  });
}
