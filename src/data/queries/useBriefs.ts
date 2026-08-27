import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBrief,
  deleteBrief,
  listBriefs,
  revokeBrief,
  type CreateBriefInput,
} from '@/data/repos/briefs.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

/**
 * Briefy klienta (T-93).
 *
 * `refetchInterval` jak przy uwagach: to jeden lekki select na otwartej
 * karcie klienta, a nie subskrypcja do sprzątania. Brief wypełnia się na
 * raty, więc odświeżenie co minutę pokazuje postęp bez przeładowania strony.
 */
export function useBriefs(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.briefs(clientId ?? ''),
    queryFn: () => listBriefs(clientId!),
    enabled: Boolean(clientId),
    refetchInterval: 60_000,
  });
}

export function useCreateBrief(clientId: string) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (input: Omit<CreateBriefInput, 'workspaceId' | 'clientId'>) =>
      createBrief({ ...input, workspaceId: requireWorkspaceId(workspaceId), clientId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.briefs(clientId) });
    },
  });
}

export function useRevokeBrief(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeBrief(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.briefs(clientId) });
    },
  });
}

export function useDeleteBrief(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBrief(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.briefs(clientId) });
    },
  });
}
