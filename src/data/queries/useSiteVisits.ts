import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSiteVisit,
  deleteSiteVisit,
  listSiteVisits,
  updateSiteVisit,
  type SiteVisitPatch,
} from '@/data/repos/site-visits.repo';
import { queryKeys } from '@/data/query-keys';
import { requireWorkspaceId, useWorkspaceId } from './useWorkspace';

export function useSiteVisits(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.siteVisits(projectId ?? ''),
    queryFn: () => listSiteVisits(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateSiteVisit(projectId: string) {
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  return useMutation({
    mutationFn: (visitedAt: string) =>
      createSiteVisit({ workspaceId: requireWorkspaceId(workspaceId), projectId, visitedAt }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits(projectId) });
    },
  });
}

export function useUpdateSiteVisit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SiteVisitPatch }) =>
      updateSiteVisit(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits(projectId) });
    },
  });
}

export function useDeleteSiteVisit(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSiteVisit(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.siteVisits(projectId) });
    },
  });
}
